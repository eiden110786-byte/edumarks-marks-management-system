import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AdminAnalytics() {
  const [subjectAvg, setSubjectAvg] = useState<{ name: string; average: number }[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; total: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [marksRes, subjectsRes, profilesRes] = await Promise.all([
        supabase.from('marks').select('*'),
        supabase.from('subjects').select('id, name'),
        supabase.from('profiles').select('user_id, full_name'),
      ]);
      const marks = marksRes.data ?? [];
      const subjects = subjectsRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      // Subject averages
      const avgMap: Record<string, { total: number; count: number; name: string }> = {};
      marks.forEach(m => {
        const sub = subjects.find(s => s.id === m.subject_id);
        if (!sub) return;
        if (!avgMap[m.subject_id]) avgMap[m.subject_id] = { total: 0, count: 0, name: sub.name };
        avgMap[m.subject_id].total += Number(m.marks_obtained);
        avgMap[m.subject_id].count++;
      });
      setSubjectAvg(Object.values(avgMap).map(v => ({ name: v.name, average: Math.round(v.total / v.count) })));

      // Top students
      const studentTotals: Record<string, number> = {};
      marks.forEach(m => { studentTotals[m.student_id] = (studentTotals[m.student_id] ?? 0) + Number(m.marks_obtained); });
      const sorted = Object.entries(studentTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTopStudents(sorted.map(([id, total]) => ({
        name: profiles.find(p => p.user_id === id)?.full_name ?? 'Unknown',
        total,
      })));
    };
    fetch();
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-description">Institutional performance overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-display">Subject-wise Average</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAvg}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="hsl(220,70%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Top 5 Students</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStudents} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(165,60%,40%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
