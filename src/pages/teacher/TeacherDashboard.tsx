import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BookOpen, Users, ClipboardList } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ subjects: 0, students: 0, marksEntered: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [tsRes, sbRes, marksRes] = await Promise.all([
        supabase.from('teacher_subjects').select('subject_id, batch_id').eq('teacher_id', user.id),
        supabase.from('student_batches').select('student_id, batch_id'),
        supabase.from('marks').select('id', { count: 'exact', head: true }).eq('entered_by', user.id),
      ]);
      const assignments = tsRes.data ?? [];
      const batchIds = [...new Set(assignments.map(a => a.batch_id))];
      const studentsInBatches = (sbRes.data ?? []).filter(sb => batchIds.includes(sb.batch_id));
      setStats({
        subjects: assignments.length,
        students: new Set(studentsInBatches.map(s => s.student_id)).size,
        marksEntered: marksRes.count ?? 0,
      });
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Teacher Dashboard</h1>
        <p className="page-description">Welcome back! Here's your overview.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Assigned Subjects" value={stats.subjects} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard title="Students" value={stats.students} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Marks Entered" value={stats.marksEntered} icon={<ClipboardList className="w-5 h-5" />} />
      </div>
    </DashboardLayout>
  );
}
