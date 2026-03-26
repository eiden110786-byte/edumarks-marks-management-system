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

interface StudentAtt {
  student_id: string; student_name: string; status: string; existing_id?: string;
}

export default function AdminAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentAtt[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [subRes, batchRes] = await Promise.all([
        supabase.from('subjects').select('id, name'),
        supabase.from('batches').select('id, name'),
      ]);
      setSubjects(subRes.data ?? []);
      setBatches(batchRes.data ?? []);
    };
    fetch();
  }, []);

  const loadStudents = async () => {
    if (!selectedSubject || !selectedBatch) return;
    const [sbRes, profileRes, attRes] = await Promise.all([
      supabase.from('student_batches').select('student_id').eq('batch_id', selectedBatch),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('attendance').select('*').eq('subject_id', selectedSubject).eq('batch_id', selectedBatch).eq('date', date),
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

  useEffect(() => { if (selectedSubject && selectedBatch) loadStudents(); }, [selectedSubject, selectedBatch, date]);

  const toggleStatus = (studentId: string) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' } : s
    ));
  };

  const saveAttendance = async () => {
    if (!user) return;
    setSaving(true);
    for (const s of students) {
      if (s.existing_id) {
        await supabase.from('attendance').update({ status: s.status }).eq('id', s.existing_id);
      } else {
        await supabase.from('attendance').insert({
          student_id: s.student_id, batch_id: selectedBatch, subject_id: selectedSubject,
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
        <div className="flex-1 max-w-xs">
          <Label>Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-xs">
          <Label>Batch</Label>
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
            <SelectContent>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="max-w-xs">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {selectedSubject && selectedBatch && (
          <div className="flex items-end">
            <Button onClick={saveAttendance} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {selectedSubject && selectedBatch && students.length > 0 && (
        <div className="flex gap-4 mb-4">
          <Badge className="bg-success/10 text-success">Present: {presentCount}</Badge>
          <Badge className="bg-destructive/10 text-destructive">Absent: {absentCount}</Badge>
        </div>
      )}

      {selectedSubject && selectedBatch && (
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
