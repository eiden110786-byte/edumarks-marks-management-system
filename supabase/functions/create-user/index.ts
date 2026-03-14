import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
  if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
  if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  const { email, password, full_name, role } = await req.json();
  if (!email || !password || !full_name || !role) {
    return new Response(JSON.stringify({ error: "email, password, full_name, role required" }), { status: 400, headers: corsHeaders });
  }

  // Try to create user; if already exists in auth (soft-deleted), delete first then recreate
  let createResult = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, requested_role: role },
  });

  if (createResult.error && createResult.error.message.includes("already been registered")) {
    // User exists in auth (possibly soft-deleted). List users to find and delete them first.
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users?.find((u: any) => u.email === email);
    if (existing) {
      // Clean up public tables
      await supabaseAdmin.from("marks").delete().eq("student_id", existing.id);
      await supabaseAdmin.from("marks").delete().eq("entered_by", existing.id);
      await supabaseAdmin.from("student_batches").delete().eq("student_id", existing.id);
      await supabaseAdmin.from("teacher_subjects").delete().eq("teacher_id", existing.id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", existing.id);
      await supabaseAdmin.from("profiles").delete().eq("user_id", existing.id);
      await supabaseAdmin.auth.admin.deleteUser(existing.id);
    }

    // Retry creation
    createResult = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, requested_role: role },
    });
  }

  if (createResult.error) {
    return new Response(JSON.stringify({ error: createResult.error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ user: createResult.data.user }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
