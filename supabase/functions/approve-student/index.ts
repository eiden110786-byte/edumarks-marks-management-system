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

  const { student_user_id, action } = await req.json();
  if (!student_user_id || !action) {
    return new Response(JSON.stringify({ error: "student_user_id and action required" }), { status: 400, headers: corsHeaders });
  }

  if (action === "approve") {
    // Update approval status
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("user_id", student_user_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get student email
    const { data: { user: student } } = await supabaseAdmin.auth.admin.getUserById(student_user_id);
    
    if (student?.email) {
      // Send approval email via Supabase Auth magic link or custom approach
      // For now, we use a simple approach: send a password reset-like email
      // Actually, let's just use the admin API to send a custom email
      // We'll use a simple approach - the student can now login
      console.log(`Student ${student.email} approved. They can now sign in.`);
    }

    return new Response(JSON.stringify({ success: true, message: "Student approved" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } else if (action === "reject") {
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("user_id", student_user_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message: "Student rejected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
});
