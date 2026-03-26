import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';

interface AttendanceRecord {
  id: string; subject_name: string; date: string; status: string;
}

interface SubjectAttendance {
  subject: string; total: number; present: number; percentage: number;
}

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectAttendance[]>([]);
  const [overallPct, setOverallPct] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [attRes, subRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('student_id', user.id).order('date', { ascending: false }),
        supabase.from('subjects').select('*'),
      ]);
      const subs = subRes.data ?? [];
      const att = attRes.data ?? [];
      setRecords(att.map(a => ({
        id: a.id, subject_name: subs.find(s => s.id === a.subject_id)?.name ?? '',
        date: a.date, status: a.status,
      })));

      // Group by subject
      const grouped: Record<string, { total: number; present: number; name: string }> = {};
      att.forEach(a => {
        const name = subs.find(s => s.id === a.subject_id)?.name ?? '';
        if (!grouped[a.subject_id]) grouped[a.subject_id] = { total: 0, present: 0, name };
        grouped[a.subject_id].total++;
        if (a.status === 'Present') grouped[a.subject_id].present++;
      });
      const stats = Object.values(grouped).map(g => ({
        subject: g.name, total: g.total, present: g.present,
        percentage: g.total > 0 ? Math.round((g.present / g.total) * 100) : 0,
      }));
      setSubjectStats(stats);
      const totalClasses = att.length;
      const totalPresent = att.filter(a => a.status === 'Present').length;
      setOverallPct(totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">My Attendance</h1>
        <p className="page-description">Your attendance records and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overall Attendance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overallPct}%</p>
            <Progress value={overallPct} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Classes</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{records.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Present</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-success">{records.filter(r => r.status === 'Present').length}</p></CardContent>
        </Card>
      </div>

      {subjectStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Subject-wise Attendance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {subjectStats.map(s => (
              <div key={s.subject} className="flex items-center gap-4">
                <span className="w-40 text-sm font-medium truncate">{s.subject}</span>
                <Progress value={s.percentage} className="flex-1" />
                <span className="text-sm font-medium w-12 text-right">{s.percentage}%</span>
                <span className="text-xs text-muted-foreground w-16">({s.present}/{s.total})</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map(r => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{r.subject_name}</TableCell>
                <TableCell>
                  <Badge className={r.status === 'Present' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                    {r.status === 'Present' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No attendance records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
