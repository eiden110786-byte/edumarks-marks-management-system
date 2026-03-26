import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudentAttendanceRow {
  student_id: string; student_name: string; status: string; existing_id?: string;
}

export default function TeacherAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teacherSubjects, setTeacherSubjects] = useState<{ subject_id: string; batch_id: string; subject_name: string; batch_name: string }[]>([]);
  const [selectedSubBatch, setSelectedSubBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [tsRes, subRes, batchRes] = await Promise.all([
        supabase.from('teacher_subjects').select('*').eq('teacher_id', user.id),
        supabase.from('subjects').select('*'),
        supabase.from('batches').select('*'),
      ]);
      setTeacherSubjects((tsRes.data ?? []).map(ts => ({
        subject_id: ts.subject_id, batch_id: ts.batch_id,
        subject_name: (subRes.data ?? []).find(s => s.id === ts.subject_id)?.name ?? '',
        batch_name: (batchRes.data ?? []).find(b => b.id === ts.batch_id)?.name ?? '',
      })));
    };
    fetchData();
  }, [user]);

  const loadStudents = async (key?: string) => {
    const k = key || selectedSubBatch;
    if (!k) return;
    const [subId, batchId] = k.split('|');
    const [sbRes, profileRes, attRes] = await Promise.all([
      supabase.from('student_batches').select('student_id').eq('batch_id', batchId),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('attendance').select('*').eq('subject_id', subId).eq('batch_id', batchId).eq('date', date),
    ]);
    const profiles = profileRes.data ?? [];
    const existing = attRes.data ?? [];
    setStudents((sbRes.data ?? []).map(sb => {
      const ex = existing.find(a => a.student_id === sb.student_id);
      return {
        student_id: sb.student_id,
        student_name: profiles.find(p => p.user_id === sb.student_id)?.full_name ?? '',
        status: ex?.status ?? 'Present',
        existing_id: ex?.id,
      };
    }));
  };

  const handleSelect = (key: string) => { setSelectedSubBatch(key); loadStudents(key); };
  useEffect(() => { if (selectedSubBatch) loadStudents(); }, [date]);

  const toggleStatus = (studentId: string) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' } : s
    ));
  };

  const saveAttendance = async () => {
    if (!user) return;
    setSaving(true);
    const [subId, batchId] = selectedSubBatch.split('|');
    for (const s of students) {
      if (s.existing_id) {
        await supabase.from('attendance').update({ status: s.status }).eq('id', s.existing_id);
      } else {
        await supabase.from('attendance').insert({
          student_id: s.student_id, batch_id: batchId, subject_id: subId,
          date, status: s.status, marked_by: user.id,
        });
      }
    }
    toast({ title: 'Attendance saved' });
    setSaving(false);
    loadStudents();
  };

  const presentCount = students.filter(s => s.status === 'Present').length;
  const absentCount = students.filter(s => s.status === 'Absent').length;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Mark Attendance</h1>
        <p className="page-description">Select subject, batch and date to mark attendance</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-sm">
          <Label>Subject & Batch</Label>
          <Select value={selectedSubBatch} onValueChange={handleSelect}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {teacherSubjects.map(ts => (
                <SelectItem key={`${ts.subject_id}|${ts.batch_id}`} value={`${ts.subject_id}|${ts.batch_id}`}>
                  {ts.subject_name} — {ts.batch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="max-w-xs">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {selectedSubBatch && (
          <div className="flex items-end">
            <Button onClick={saveAttendance} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {selectedSubBatch && students.length > 0 && (
        <div className="flex gap-4 mb-4">
          <Badge className="bg-success/10 text-success">Present: {presentCount}</Badge>
          <Badge className="bg-destructive/10 text-destructive">Absent: {absentCount}</Badge>
        </div>
      )}

      {selectedSubBatch && (
        <div className="border rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.student_id}>
                  <TableCell className="font-medium">{s.student_name}</TableCell>
                  <TableCell>
                    <Badge className={s.status === 'Present' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                      {s.status === 'Present' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(s.student_id)}>
                      {s.status === 'Present' ? 'Mark Absent' : 'Mark Present'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No students in this batch</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardLayout>
  );
}
