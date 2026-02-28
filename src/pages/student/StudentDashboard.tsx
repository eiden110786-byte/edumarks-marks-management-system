import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BookOpen, Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function getGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalMarks: 0, totalMax: 0, percentage: 0, grade: 'N/A', subjects: 0 });
  const [chartData, setChartData] = useState<{ name: string; marks: number; max: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [marksRes, subjectsRes] = await Promise.all([
        supabase.from('marks').select('*').eq('student_id', user.id),
        supabase.from('subjects').select('*'),
      ]);
      const marks = marksRes.data ?? [];
      const subjects = subjectsRes.data ?? [];
      let total = 0, totalMax = 0;
      const data = marks.map(m => {
        const sub = subjects.find(s => s.id === m.subject_id);
        const obtained = Number(m.marks_obtained);
        const max = sub?.max_marks ?? 100;
        total += obtained;
        totalMax += max;
        return { name: sub?.name ?? '', marks: obtained, max };
      });
      const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;
      setStats({ totalMarks: total, totalMax, percentage: pct, grade: getGrade(pct), subjects: marks.length });
      setChartData(data);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Student Dashboard</h1>
        <p className="page-description">Your academic overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Subjects" value={stats.subjects} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard title="Percentage" value={`${stats.percentage}%`} icon={<TrendingUp className="w-5 h-5" />} description={`${stats.totalMarks}/${stats.totalMax} total marks`} />
        <StatCard title="Grade" value={stats.grade} icon={<Award className="w-5 h-5" />} />
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display">Subject-wise Marks</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="marks" fill="hsl(220,70%,50%)" radius={[4, 4, 0, 0]} name="Obtained" />
                  <Bar dataKey="max" fill="hsl(210,15%,85%)" radius={[4, 4, 0, 0]} name="Max" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
