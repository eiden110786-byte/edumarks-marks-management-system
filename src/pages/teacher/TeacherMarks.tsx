import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface Assignment { subject_id: string; batch_id: string; subject_name: string; batch_name: string; max_marks: number; pass_marks: number; }
interface StudentMark { student_id: string; student_name: string; marks_obtained: number; existing_id?: string; }

export default function TeacherMarks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [tsRes, subRes, batchRes] = await Promise.all([
        supabase.from('teacher_subjects').select('*').eq('teacher_id', user.id),
        supabase.from('subjects').select('*'),
        supabase.from('batches').select('*'),
      ]);
      const subs = subRes.data ?? [];
      const bats = batchRes.data ?? [];
      setAssignments((tsRes.data ?? []).map(ts => {
        const sub = subs.find(s => s.id === ts.subject_id);
        return {
          subject_id: ts.subject_id,
          batch_id: ts.batch_id,
          subject_name: sub?.name ?? '',
          batch_name: bats.find(b => b.id === ts.batch_id)?.name ?? '',
          max_marks: sub?.max_marks ?? 100,
          pass_marks: sub?.pass_marks ?? 40,
        };
      }));
    };
    fetch();
  }, [user]);

  const loadStudents = async (key: string) => {
    setSelectedAssignment(key);
    const [subId, batchId] = key.split('|');
    const assignment = assignments.find(a => a.subject_id === subId && a.batch_id === batchId);
    if (!assignment) return;

    const [sbRes, profilesRes, marksRes] = await Promise.all([
      supabase.from('student_batches').select('student_id').eq('batch_id', batchId),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('marks').select('*').eq('subject_id', subId).eq('batch_id', batchId),
    ]);
    const profiles = profilesRes.data ?? [];
    const existingMarks = marksRes.data ?? [];

    setStudents((sbRes.data ?? []).map(sb => {
      const existing = existingMarks.find(m => m.student_id === sb.student_id);
      return {
        student_id: sb.student_id,
        student_name: profiles.find(p => p.user_id === sb.student_id)?.full_name ?? '',
        marks_obtained: existing ? Number(existing.marks_obtained) : 0,
        existing_id: existing?.id,
      };
    }));
  };

  const updateMark = (studentId: string, value: number) => {
    const [subId] = selectedAssignment.split('|');
    const assignment = assignments.find(a => a.subject_id === subId);
    const max = assignment?.max_marks ?? 100;
    const clamped = Math.min(Math.max(0, value), max);
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, marks_obtained: clamped } : s));
  };

  const saveMarks = async () => {
    if (!user) return;
    setSaving(true);
    const [subId, batchId] = selectedAssignment.split('|');

    for (const s of students) {
      if (s.existing_id) {
        await supabase.from('marks').update({ marks_obtained: s.marks_obtained }).eq('id', s.existing_id);
      } else {
        await supabase.from('marks').insert({
          student_id: s.student_id,
          subject_id: subId,
          batch_id: batchId,
          marks_obtained: s.marks_obtained,
          entered_by: user.id,
        });
      }
    }
    toast({ title: 'Marks saved successfully' });
    setSaving(false);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as { email?: string; marks?: string }[];
        setStudents(prev => prev.map(s => {
          const row = data.find(d => d.email === s.student_name || d.email === s.student_id);
          if (row?.marks) return { ...s, marks_obtained: Number(row.marks) };
          return s;
        }));
        toast({ title: 'CSV loaded', description: `${data.length} rows processed` });
      },
    });
  };

  const currentAssignment = selectedAssignment ? assignments.find(a => `${a.subject_id}|${a.batch_id}` === selectedAssignment) : null;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Enter Marks</h1>
        <p className="page-description">Select a subject and batch to enter marks</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-sm">
          <Label>Subject & Batch</Label>
          <Select value={selectedAssignment} onValueChange={loadStudents}>
            <SelectTrigger><SelectValue placeholder="Select assignment" /></SelectTrigger>
            <SelectContent>
              {assignments.map(a => (
                <SelectItem key={`${a.subject_id}|${a.batch_id}`} value={`${a.subject_id}|${a.batch_id}`}>
                  {a.subject_name} — {a.batch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedAssignment && (
          <div className="flex gap-2 items-end">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />CSV Upload
            </Button>
            <Button onClick={saveMarks} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        )}
      </div>

      {selectedAssignment && (
        <div className="border rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Marks (max: {currentAssignment?.max_marks})</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.student_id}>
                  <TableCell className="font-medium">{s.student_name || s.student_id}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      min={0}
                      max={currentAssignment?.max_marks}
                      value={s.marks_obtained}
                      onChange={e => updateMark(s.student_id, Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={s.marks_obtained >= (currentAssignment?.pass_marks ?? 40) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                      {s.marks_obtained >= (currentAssignment?.pass_marks ?? 40) ? 'Pass' : 'Fail'}
                    </Badge>
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
