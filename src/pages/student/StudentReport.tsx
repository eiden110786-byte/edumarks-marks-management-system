import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function getGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

interface MarkRow { subject: string; code: string; obtained: number; max: number; percentage: number; grade: string; status: string; }

export default function StudentReport() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; email: string }>({ full_name: '', email: '' });
  const [totals, setTotals] = useState({ obtained: 0, max: 0, pct: 0, grade: '' });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [marksRes, subjectsRes, profileRes] = await Promise.all([
        supabase.from('marks').select('*').eq('student_id', user.id),
        supabase.from('subjects').select('*'),
        supabase.from('profiles').select('full_name, email').eq('user_id', user.id).single(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      const subjects = subjectsRes.data ?? [];
      let totalObt = 0, totalMax = 0;
      const rows: MarkRow[] = (marksRes.data ?? []).map(m => {
        const sub = subjects.find(s => s.id === m.subject_id);
        const obt = Number(m.marks_obtained);
        const max = sub?.max_marks ?? 100;
        const pct = Math.round((obt / max) * 100);
        totalObt += obt;
        totalMax += max;
        return { subject: sub?.name ?? '', code: sub?.code ?? '', obtained: obt, max, percentage: pct, grade: getGrade(pct), status: obt >= (sub?.pass_marks ?? 40) ? 'Pass' : 'Fail' };
      });
      const totalPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
      setMarks(rows);
      setTotals({ obtained: totalObt, max: totalMax, pct: totalPct, grade: getGrade(totalPct) });
    };
    fetch();
  }, [user]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('EduMarks Report Card', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student: ${profile.full_name}`, 20, 40);
    doc.text(`Email: ${profile.email}`, 20, 48);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 56);

    // Table
    autoTable(doc, {
      startY: 70,
      head: [['Code', 'Subject', 'Marks', 'Percentage', 'Grade', 'Status']],
      body: [
        ...marks.map(m => [m.code, m.subject, `${m.obtained}/${m.max}`, `${m.percentage}%`, m.grade, m.status]),
        ['', 'TOTAL', `${totals.obtained}/${totals.max}`, `${totals.pct}%`, totals.grade, totals.pct >= 40 ? 'Pass' : 'Fail'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 105, 201] },
      styles: { fontSize: 10 },
    });

    doc.save(`report-card-${profile.full_name.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Report Card</h1>
          <p className="page-description">Your complete academic report</p>
        </div>
        <Button onClick={downloadPDF} disabled={marks.length === 0}>
          <Download className="w-4 h-4 mr-2" />Download PDF
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="font-display">Student Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{profile.full_name || '—'}</p></div>
          <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{profile.email}</p></div>
          <div><p className="text-sm text-muted-foreground">Overall Grade</p><p className="text-2xl font-bold font-display">{totals.grade || 'N/A'}</p></div>
          <div><p className="text-sm text-muted-foreground">Percentage</p><p className="text-2xl font-bold font-display">{totals.pct}%</p></div>
        </CardContent>
      </Card>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>%</TableHead>
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
                <TableCell>{m.grade}</TableCell>
                <TableCell>
                  <span className={m.status === 'Pass' ? 'text-success font-medium' : 'text-destructive font-medium'}>{m.status}</span>
                </TableCell>
              </TableRow>
            ))}
            {marks.length > 0 && (
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell>{totals.obtained}/{totals.max}</TableCell>
                <TableCell>{totals.pct}%</TableCell>
                <TableCell>{totals.grade}</TableCell>
                <TableCell><span className={totals.pct >= 40 ? 'text-success' : 'text-destructive'}>{totals.pct >= 40 ? 'Pass' : 'Fail'}</span></TableCell>
              </TableRow>
            )}
            {marks.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No marks available</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
