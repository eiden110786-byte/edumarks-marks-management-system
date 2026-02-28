import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function getGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

interface MarkRow { subject: string; code: string; obtained: number; max: number; pass: number; percentage: number; grade: string; status: string; }

export default function StudentMarks() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [totals, setTotals] = useState({ obtained: 0, max: 0, pct: 0, grade: '' });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [marksRes, subjectsRes] = await Promise.all([
        supabase.from('marks').select('*').eq('student_id', user.id),
        supabase.from('subjects').select('*'),
      ]);
      const subjects = subjectsRes.data ?? [];
      let totalObt = 0, totalMax = 0;
      const rows: MarkRow[] = (marksRes.data ?? []).map(m => {
        const sub = subjects.find(s => s.id === m.subject_id);
        const obt = Number(m.marks_obtained);
        const max = sub?.max_marks ?? 100;
        const pass = sub?.pass_marks ?? 40;
        const pct = Math.round((obt / max) * 100);
        totalObt += obt;
        totalMax += max;
        return { subject: sub?.name ?? '', code: sub?.code ?? '', obtained: obt, max, pass, percentage: pct, grade: getGrade(pct), status: obt >= pass ? 'Pass' : 'Fail' };
      });
      const totalPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
      setMarks(rows);
      setTotals({ obtained: totalObt, max: totalMax, pct: totalPct, grade: getGrade(totalPct) });
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">My Marks</h1>
        <p className="page-description">Detailed subject-wise marks breakdown</p>
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.map(m => (
              <TableRow key={m.code}>
                <TableCell className="font-mono text-sm">{m.code}</TableCell>
                <TableCell className="font-medium">{m.subject}</TableCell>
                <TableCell>{m.obtained}/{m.max}</TableCell>
                <TableCell>{m.percentage}%</TableCell>
                <TableCell><Badge variant="outline">{m.grade}</Badge></TableCell>
                <TableCell>
                  <Badge className={m.status === 'Pass' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>{m.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {marks.length > 0 && (
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell>{totals.obtained}/{totals.max}</TableCell>
                <TableCell>{totals.pct}%</TableCell>
                <TableCell><Badge>{totals.grade}</Badge></TableCell>
                <TableCell>
                  <Badge className={totals.pct >= 40 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                    {totals.pct >= 40 ? 'Pass' : 'Fail'}
                  </Badge>
                </TableCell>
              </TableRow>
            )}
            {marks.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No marks available yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
