import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TeacherPerformance() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<{ subject_id: string; batch_id: string; subject_name: string; batch_name: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [chartData, setChartData] = useState<{ name: string; marks: number }[]>([]);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [tsRes, subRes, batchRes] = await Promise.all([
        supabase.from('teacher_subjects').select('*').eq('teacher_id', user.id),
        supabase.from('subjects').select('id, name'),
        supabase.from('batches').select('id, name'),
      ]);
      setAssignments((tsRes.data ?? []).map(ts => ({
        subject_id: ts.subject_id,
        batch_id: ts.batch_id,
        subject_name: (subRes.data ?? []).find(s => s.id === ts.subject_id)?.name ?? '',
        batch_name: (batchRes.data ?? []).find(b => b.id === ts.batch_id)?.name ?? '',
      })));
    };
    fetch();
  }, [user]);

  const loadData = async (key: string) => {
    setSelected(key);
    const [subId, batchId] = key.split('|');
    const [marksRes, profilesRes] = await Promise.all([
      supabase.from('marks').select('*').eq('subject_id', subId).eq('batch_id', batchId),
      supabase.from('profiles').select('user_id, full_name'),
    ]);
    const marks = marksRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const data = marks.map(m => ({
      name: profiles.find(p => p.user_id === m.student_id)?.full_name ?? 'Unknown',
      marks: Number(m.marks_obtained),
    }));
    setChartData(data);
    setAvg(data.length > 0 ? Math.round(data.reduce((s, d) => s + d.marks, 0) / data.length) : 0);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Class Performance</h1>
        <p className="page-description">View performance analytics for your classes</p>
      </div>

      <div className="max-w-sm mb-6">
        <Label>Subject & Batch</Label>
        <Select value={selected} onValueChange={loadData}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {assignments.map(a => (
              <SelectItem key={`${a.subject_id}|${a.batch_id}`} value={`${a.subject_id}|${a.batch_id}`}>
                {a.subject_name} — {a.batch_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="font-display">Student Marks</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="marks" fill="hsl(220,70%,50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold font-display">{chartData.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class Average</p>
                <p className="text-2xl font-bold font-display">{avg}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Highest</p>
                <p className="text-2xl font-bold font-display text-success">{chartData.length > 0 ? Math.max(...chartData.map(d => d.marks)) : 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lowest</p>
                <p className="text-2xl font-bold font-display text-destructive">{chartData.length > 0 ? Math.min(...chartData.map(d => d.marks)) : 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
