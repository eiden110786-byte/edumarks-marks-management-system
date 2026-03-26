import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function getGradePoints(pct: number): number {
  if (pct >= 90) return 4.0;
  if (pct >= 80) return 3.7;
  if (pct >= 70) return 3.3;
  if (pct >= 60) return 3.0;
  if (pct >= 50) return 2.5;
  if (pct >= 40) return 2.0;
  return 0.0;
}

interface MarkRow {
  subject: string; code: string; obtained: number; max: number;
  percentage: number; grade: string; gradePoints: number; status: string;
  semester: number; batch_name: string;
}

interface SemesterSummary {
  semester: number; batch_name: string; totalObt: number; totalMax: number;
  pct: number; grade: string; gpa: number; marks: MarkRow[];
}

export default function StudentReport() {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState<SemesterSummary[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; email: string; roll_number: string; avatar_url: string }>({
    full_name: '', email: '', roll_number: '', avatar_url: '',
  });
  const [cgpa, setCgpa] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [marksRes, subjectsRes, profileRes, batchesRes] = await Promise.all([
        supabase.from('marks').select('*').eq('student_id', user.id),
        supabase.from('subjects').select('*'),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('batches').select('*'),
      ]);
      if (profileRes.data) {
        const p = profileRes.data as any;
        setProfile({ full_name: p.full_name, email: p.email, roll_number: p.roll_number ?? '', avatar_url: p.avatar_url ?? '' });
      }
      const subjects = subjectsRes.data ?? [];
      const batches = batchesRes.data ?? [];
      const marks = marksRes.data ?? [];

      const grouped: Record<string, MarkRow[]> = {};
      marks.forEach(m => {
        const sub = subjects.find(s => s.id === m.subject_id);
        const batch = batches.find(b => b.id === m.batch_id);
        const obt = Number(m.marks_obtained);
        const max = sub?.max_marks ?? 100;
        const pct = Math.round((obt / max) * 100);
        const key = `${batch?.semester ?? 1}-${m.batch_id}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          subject: sub?.name ?? '', code: sub?.code ?? '', obtained: obt, max,
          percentage: pct, grade: getGrade(pct), gradePoints: getGradePoints(pct),
          status: obt >= (sub?.pass_marks ?? 40) ? 'Pass' : 'Fail',
          semester: batch?.semester ?? 1, batch_name: batch?.name ?? '',
        });
      });

      const semList: SemesterSummary[] = Object.entries(grouped).map(([, rows]) => {
        const totalObt = rows.reduce((a, r) => a + r.obtained, 0);
        const totalMax = rows.reduce((a, r) => a + r.max, 0);
        const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
        const gpa = rows.length > 0 ? Number((rows.reduce((a, r) => a + r.gradePoints, 0) / rows.length).toFixed(2)) : 0;
        return { semester: rows[0].semester, batch_name: rows[0].batch_name, totalObt, totalMax, pct, grade: getGrade(pct), gpa, marks: rows };
      }).sort((a, b) => a.semester - b.semester);

      setSemesters(semList);
      if (semList.length > 0) setSelectedSemester(`sem-${semList[0].semester}`);
      const totalGpa = semList.length > 0 ? Number((semList.reduce((a, s) => a + s.gpa, 0) / semList.length).toFixed(2)) : 0;
      setCgpa(totalGpa);
    };
    fetch();
  }, [user]);

  const generatePDF = (type: 'semester' | 'final', sem?: SemesterSummary) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('UNIVERSITY OF SUFISM & MODERN SCIENCES, BHIT SHAH', 105, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Grade and Academic Record Management System', 105, 22, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 26, 190, 26);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(type === 'semester' ? `SEMESTER ${sem?.semester} MARKS CERTIFICATE` : 'FINAL MARKS CERTIFICATE', 105, 34, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student: ${profile.full_name}`, 20, 44);
    doc.text(`Roll No: ${profile.roll_number || 'N/A'}`, 20, 50);
    doc.text(`Email: ${profile.email}`, 20, 56);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 44);

    if (type === 'semester' && sem) {
      doc.text(`Batch: ${sem.batch_name}`, 150, 50);
      doc.text(`GPA: ${sem.gpa}`, 150, 56);

      autoTable(doc, {
        startY: 64,
        head: [['Code', 'Subject', 'Marks', '%', 'Grade', 'GP', 'Status']],
        body: [
          ...sem.marks.map(m => [m.code, m.subject, `${m.obtained}/${m.max}`, `${m.percentage}%`, m.grade, m.gradePoints.toFixed(1), m.status]),
          ['', 'TOTAL', `${sem.totalObt}/${sem.totalMax}`, `${sem.pct}%`, sem.grade, `GPA: ${sem.gpa}`, sem.pct >= 40 ? 'Pass' : 'Fail'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 105, 201] },
        styles: { fontSize: 9 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Semester GPA: ${sem.gpa}`, 105, finalY, { align: 'center' });
      doc.text(`CGPA (up to Sem ${sem.semester}): ${cgpa}`, 105, finalY + 8, { align: 'center' });
      doc.save(`semester-${sem.semester}-certificate-${profile.full_name.replace(/\s+/g, '-')}.pdf`);
    } else {
      doc.text(`CGPA: ${cgpa}`, 150, 50);
      let startY = 64;

      semesters.forEach(s => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Semester ${s.semester} — ${s.batch_name}`, 20, startY);
        startY += 3;

        autoTable(doc, {
          startY,
          head: [['Code', 'Subject', 'Marks', '%', 'Grade', 'GP', 'Status']],
          body: [
            ...s.marks.map(m => [m.code, m.subject, `${m.obtained}/${m.max}`, `${m.percentage}%`, m.grade, m.gradePoints.toFixed(1), m.status]),
            ['', 'TOTAL', `${s.totalObt}/${s.totalMax}`, `${s.pct}%`, s.grade, `GPA: ${s.gpa}`, s.pct >= 40 ? 'Pass' : 'Fail'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [59, 105, 201] },
          styles: { fontSize: 9 },
        });
        startY = (doc as any).lastAutoTable.finalY + 10;
        if (startY > 250) { doc.addPage(); startY = 20; }
      });

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Final CGPA: ${cgpa}`, 105, startY + 5, { align: 'center' });
      doc.save(`final-marks-certificate-${profile.full_name.replace(/\s+/g, '-')}.pdf`);
    }
  };

  const renderSemesterTable = (sem: SemesterSummary) => (
    <Card key={sem.semester}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Semester {sem.semester} — {sem.batch_name}</CardTitle>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-muted-foreground">GPA: <span className="font-bold text-primary">{sem.gpa}</span></span>
            <span className="text-sm text-muted-foreground">Percentage: <span className="font-bold">{sem.pct}%</span></span>
            <Button size="sm" variant="outline" onClick={() => generatePDF('semester', sem)}>
              <Download className="w-3 h-3 mr-1" />Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead><TableHead>Subject</TableHead><TableHead>Marks</TableHead>
              <TableHead>%</TableHead><TableHead>Grade</TableHead><TableHead>GP</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sem.marks.map(m => (
              <TableRow key={m.code}>
                <TableCell className="font-mono text-sm">{m.code}</TableCell>
                <TableCell className="font-medium">{m.subject}</TableCell>
                <TableCell>{m.obtained}/{m.max}</TableCell>
                <TableCell>{m.percentage}%</TableCell>
                <TableCell>{m.grade}</TableCell>
                <TableCell>{m.gradePoints.toFixed(1)}</TableCell>
                <TableCell>
                  <span className={m.status === 'Pass' ? 'text-success font-medium' : 'text-destructive font-medium'}>{m.status}</span>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell>{sem.totalObt}/{sem.totalMax}</TableCell>
              <TableCell>{sem.pct}%</TableCell>
              <TableCell>{sem.grade}</TableCell>
              <TableCell>{sem.gpa}</TableCell>
              <TableCell><span className={sem.pct >= 40 ? 'text-success' : 'text-destructive'}>{sem.pct >= 40 ? 'Pass' : 'Fail'}</span></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const allMarks = semesters.flatMap(s => s.marks);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Marks Certificate</h1>
        <p className="page-description">Your academic marks certificates</p>
      </div>

      {/* Student Info */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-xl">{profile.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{profile.full_name || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Roll Number</p><p className="font-medium">{profile.roll_number || 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-sm">{profile.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Semesters</p><p className="text-2xl font-bold">{semesters.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Final CGPA</p><p className="text-2xl font-bold text-primary">{cgpa}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {semesters.length > 0 ? (
        <Tabs defaultValue="semester" className="space-y-4">
          <TabsList>
            <TabsTrigger value="semester">Semester-wise Certificate</TabsTrigger>
            <TabsTrigger value="final">Final Marks Certificate</TabsTrigger>
          </TabsList>

          <TabsContent value="semester" className="space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s.semester} value={`sem-${s.semester}`}>Semester {s.semester} — {s.batch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {semesters.filter(s => `sem-${s.semester}` === selectedSemester).map(renderSemesterTable)}
          </TabsContent>

          <TabsContent value="final" className="space-y-4">
            <div className="flex justify-end mb-2">
              <Button onClick={() => generatePDF('final')} disabled={allMarks.length === 0}>
                <Download className="w-4 h-4 mr-2" />Download Final Certificate
              </Button>
            </div>
            {semesters.map(renderSemesterTable)}
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-lg font-bold">Final CGPA: <span className="text-primary text-2xl">{cgpa}</span></p>
                <p className="text-muted-foreground text-sm mt-1">Cumulative Grade Point Average across {semesters.length} semester(s)</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No marks available</CardContent></Card>
      )}
    </DashboardLayout>
  );
}
