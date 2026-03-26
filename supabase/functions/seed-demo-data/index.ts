import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAKISTANI_BOY_NAMES = [
  "Ahmed Khan", "Muhammad Ali", "Hassan Raza", "Bilal Ahmed", "Usman Tariq",
  "Faisal Mahmood", "Zain ul Abideen", "Hamza Shahid", "Omar Farooq", "Saad Hussain",
  "Arslan Javed", "Kamran Akbar", "Imran Nawaz", "Shoaib Malik", "Rizwan Ahmed",
  "Tahir Abbas", "Waqar Younis", "Junaid Iqbal", "Nabeel Ashraf", "Adnan Siddiqui",
  "Fahad Mustafa", "Danish Kaneria", "Asad Shafiq", "Babar Azam", "Shahid Afridi",
  "Mohsin Khan", "Tariq Jameel", "Yasir Shah", "Haris Sohail", "Fakhar Zaman",
  "Aamir Liaquat", "Salman Butt", "Wahab Riaz", "Azhar Ali", "Sarfraz Ahmed",
  "Naseem Shah", "Shadab Khan", "Iftikhar Ahmed", "Khurram Manzoor", "Sohail Khan",
  "Mudassar Nazar", "Rashid Latif", "Inzamam ul Haq", "Wasim Akram", "Saqlain Mushtaq",
  "Misbah ul Haq", "Younis Khan", "Kamran Akmal", "Umar Akmal", "Asif Ali",
];

const PAKISTANI_GIRL_NAMES = [
  "Ayesha Siddiqui", "Fatima Zahra", "Zainab Ali", "Khadija Bibi", "Maryam Nawaz",
  "Hira Mani", "Sana Javed", "Mehwish Hayat", "Sajal Aly", "Iqra Aziz",
  "Aiman Khan", "Minal Khan", "Mahira Khan", "Hania Amir", "Kinza Hashmi",
  "Yumna Zaidi", "Saba Qamar", "Ushna Shah", "Neelam Munir", "Syra Yousuf",
  "Sanam Saeed", "Kubra Khan", "Maya Ali", "Zara Noor Abbas", "Areeba Habib",
  "Ramsha Khan", "Dur-e-Fishan", "Nimra Khan", "Laiba Khan", "Sidra Batool",
  "Amna Ilyas", "Nadia Hussain", "Tooba Siddiqui", "Fiza Ali", "Alizeh Shah",
  "Hareem Farooq", "Naimal Khawar", "Komal Meer", "Merub Ali", "Sehar Khan",
  "Madiha Imam", "Sonya Hussyn", "Faryal Mehmood", "Aiza Awan", "Noor Zafar",
  "Saboor Aly", "Urwa Hocane", "Mawra Hocane", "Sarah Khan", "Sumbul Iqbal",
];

const TEACHER_NAMES = [
  "Dr. Asif Nawaz", "Prof. Saima Akbar", "Dr. Khalid Mehmood", "Prof. Nazia Parveen",
  "Dr. Tariq Mahmood", "Prof. Rabia Sultana", "Dr. Zahid Hussain", "Prof. Amina Bibi",
  "Dr. Faizan Ahmed", "Prof. Samina Yasmeen", "Dr. Arshad Ali", "Prof. Bushra Naseem",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // List all existing users once
    const allPages: any[] = [];
    for (let page = 1; page <= 5; page++) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 500 });
      if (data?.users?.length) allPages.push(...data.users);
      else break;
    }
    const existingByEmail = new Map(allPages.map(u => [u.email, u]));

    // ---- Clean up ----
    await supabaseAdmin.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("fee_payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("assignment_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("assignment_uploads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("student_batches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("marks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("teacher_subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("batches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { data: batches } = await supabaseAdmin.from("batches").insert([
      { name: "BSCS-2K25 (Sem 1)", year: 2025, semester: 1 },
      { name: "BSCS-2K25 (Sem 2)", year: 2025, semester: 2 },
      { name: "BSIT-2K25 (Sem 1)", year: 2025, semester: 1 },
      { name: "BSIT-2K25 (Sem 2)", year: 2025, semester: 2 },
      { name: "BBA-2K25 (Sem 1)", year: 2025, semester: 1 },
      { name: "BBA-2K25 (Sem 2)", year: 2025, semester: 2 },
    ]).select();

    const { data: subjects } = await supabaseAdmin.from("subjects").insert([
      { name: "Programming Fundamentals", code: "CS101", max_marks: 100, pass_marks: 40 },
      { name: "Data Structures", code: "CS201", max_marks: 100, pass_marks: 40 },
      { name: "Database Systems", code: "CS301", max_marks: 100, pass_marks: 40 },
      { name: "Operating Systems", code: "CS302", max_marks: 100, pass_marks: 40 },
      { name: "Calculus", code: "MATH101", max_marks: 100, pass_marks: 40 },
      { name: "Linear Algebra", code: "MATH201", max_marks: 100, pass_marks: 40 },
      { name: "Physics", code: "PHY101", max_marks: 100, pass_marks: 40 },
      { name: "English Composition", code: "ENG101", max_marks: 100, pass_marks: 40 },
      { name: "Pakistan Studies", code: "PST101", max_marks: 100, pass_marks: 40 },
      { name: "Islamic Studies", code: "ISL101", max_marks: 100, pass_marks: 40 },
      { name: "Software Engineering", code: "CS401", max_marks: 100, pass_marks: 40 },
      { name: "Computer Networks", code: "CS402", max_marks: 100, pass_marks: 40 },
    ]).select();

    // Helper to get or create user
    const getOrCreate = async (email: string, password: string, name: string, role: string) => {
      const existing = existingByEmail.get(email);
      if (existing) {
        await supabaseAdmin.from("profiles").update({ full_name: name }).eq("user_id", existing.id);
        // Ensure role exists
        await supabaseAdmin.from("user_roles").upsert({ user_id: existing.id, role }, { onConflict: "user_id" });
        return existing.id;
      }
      const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: name, requested_role: role },
      });
      if (newUser?.user) {
        await supabaseAdmin.from("profiles").upsert({ user_id: newUser.user.id, email, full_name: name }, { onConflict: "user_id" });
        await supabaseAdmin.from("user_roles").upsert({ user_id: newUser.user.id, role }, { onConflict: "user_id" });
        return newUser.user.id;
      }
      return null;
    };

    // ---- Admin ----
    const adminId = await getOrCreate("admin@edumarks.com", "admin123", "Administrator", "admin");

    // ---- Teachers ----
    const teacherIds: string[] = [];
    for (let i = 0; i < TEACHER_NAMES.length; i++) {
      const id = await getOrCreate(`teacher${i + 1}@edumarks.com`, "teacher123", TEACHER_NAMES[i], "teacher");
      if (id) teacherIds.push(id);
    }

    // ---- Students ----
    const allNames = [...PAKISTANI_BOY_NAMES, ...PAKISTANI_GIRL_NAMES];
    const studentIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const id = await getOrCreate(`student${i + 1}@edumarks.com`, "student123", allNames[i % allNames.length], "student");
      if (id) studentIds.push(id);
    }

    // ---- Student Batches ----
    if (batches && batches.length > 0) {
      const sbInserts = studentIds.map((sid, idx) => ({
        student_id: sid, batch_id: batches[idx % batches.length].id,
      }));
      for (let i = 0; i < sbInserts.length; i += 50) {
        await supabaseAdmin.from("student_batches").insert(sbInserts.slice(i, i + 50));
      }
    }

    // ---- Teacher Subject Assignments ----
    if (subjects && batches && teacherIds.length > 0) {
      const tsInserts: any[] = [];
      for (let si = 0; si < subjects.length; si++) {
        for (let bi = 0; bi < batches.length; bi++) {
          tsInserts.push({
            teacher_id: teacherIds[(si + bi) % teacherIds.length],
            subject_id: subjects[si].id,
            batch_id: batches[bi].id,
          });
        }
      }
      for (let i = 0; i < tsInserts.length; i += 50) {
        await supabaseAdmin.from("teacher_subjects").insert(tsInserts.slice(i, i + 50));
      }

      // ---- Marks ----
      const marksInserts: any[] = [];
      for (const sid of studentIds) {
        const batchIdx = studentIds.indexOf(sid) % batches.length;
        for (const sub of subjects.slice(0, 6)) {
          marksInserts.push({
            student_id: sid, subject_id: sub.id, batch_id: batches[batchIdx].id,
            marks_obtained: Math.floor(Math.random() * 65) + 35,
            entered_by: teacherIds[subjects.indexOf(sub) % teacherIds.length],
          });
        }
      }
      for (let i = 0; i < marksInserts.length; i += 50) {
        await supabaseAdmin.from("marks").insert(marksInserts.slice(i, i + 50));
      }

      // ---- Attendance (last 30 days) ----
      const attendanceInserts: any[] = [];
      const today = new Date();
      for (let day = 0; day < 30; day++) {
        const d = new Date(today);
        d.setDate(d.getDate() - day);
        if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
        const dateStr = d.toISOString().split("T")[0];
        
        // For each batch, pick 2 subjects and mark attendance
        for (let bi = 0; bi < batches.length; bi++) {
          const batchStudents = studentIds.filter((_, idx) => idx % batches.length === bi);
          const subjectSlice = subjects.slice(bi % 3 * 2, bi % 3 * 2 + 2);
          
          for (const sub of subjectSlice) {
            const teacherIdx = (subjects.indexOf(sub) + bi) % teacherIds.length;
            for (const sid of batchStudents) {
              attendanceInserts.push({
                student_id: sid,
                batch_id: batches[bi].id,
                subject_id: sub.id,
                date: dateStr,
                status: Math.random() > 0.15 ? "Present" : "Absent",
                marked_by: teacherIds[teacherIdx],
              });
            }
          }
        }
      }
      // Insert attendance in batches
      for (let i = 0; i < attendanceInserts.length; i += 100) {
        await supabaseAdmin.from("attendance").insert(attendanceInserts.slice(i, i + 100));
      }

      // ---- Fee Payments ----
      const feeInserts: any[] = [];
      const statuses = ["Pending", "Verified", "Verified", "Pending", "Verified"];
      for (let i = 0; i < studentIds.length; i++) {
        const batchIdx = i % batches.length;
        const semester = batches[batchIdx].semester;
        feeInserts.push({
          student_id: studentIds[i],
          amount: 25000 + Math.floor(Math.random() * 10000),
          semester,
          challan_id: `CH-2025-${String(i + 1).padStart(4, "0")}`,
          status: statuses[i % statuses.length],
          payment_date: new Date(2025, semester - 1, 10 + (i % 15)).toISOString().split("T")[0],
          verified_by: statuses[i % statuses.length] === "Verified" ? adminId : null,
          verified_at: statuses[i % statuses.length] === "Verified" ? new Date().toISOString() : null,
        });
      }
      for (let i = 0; i < feeInserts.length; i += 50) {
        await supabaseAdmin.from("fee_payments").insert(feeInserts.slice(i, i + 50));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        admin: adminId ? 1 : 0,
        students: studentIds.length,
        teachers: teacherIds.length,
        batches: batches?.length,
        subjects: subjects?.length,
        marks: studentIds.length * 6,
        attendance: "30 days seeded",
        fees: studentIds.length,
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
