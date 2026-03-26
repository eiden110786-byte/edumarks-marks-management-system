import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Pencil, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarkRow {
  id: string; student_id: string; subject_id: string; batch_id: string;
  student_name: string; subject_name: string; batch_name: string;
  marks_obtained: number; max_marks: number; pass_marks: number;
}

interface StudentMark {
  student_id: string; student_name: string; marks_obtained: number; existing_id?: string;
}

export default function AdminMarks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editMark, setEditMark] = useState<MarkRow | null>(null);
  const [editMarksVal, setEditMarksVal] = useState(0);

  // Assign marks state
  const [subjects, setSubjects] = useState<{ id: string; name: string; max_marks: number; pass_marks: number }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selSubject, setSelSubject] = useState('');
  const [selBatch, setSelBatch] = useState('');
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchMarks = async () => {
    const [marksRes, profilesRes, subjectsRes, batchesRes] = await Promise.all([
      supabase.from('marks').select('*'),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('subjects').select('id, name, max_marks, pass_marks'),
      supabase.from('batches').select('id, name'),
    ]);
    const profiles = profilesRes.data ?? [];
    const subs = subjectsRes.data ?? [];
    const bats = batchesRes.data ?? [];
    setSubjects(subs);
    setBatches(bats);
    setMarks((marksRes.data ?? []).map(m => {
      const sub = subs.find(s => s.id === m.subject_id);
      return {
        id: m.id, student_id: m.student_id, subject_id: m.subject_id, batch_id: m.batch_id,
        student_name: profiles.find(p => p.user_id === m.student_id)?.full_name ?? '',
        subject_name: sub?.name ?? '', batch_name: bats.find(b => b.id === m.batch_id)?.name ?? '',
        marks_obtained: Number(m.marks_obtained), max_marks: sub?.max_marks ?? 100, pass_marks: sub?.pass_marks ?? 40,
      };
    }));
  };

  useEffect(() => { fetchMarks(); }, []);

  const handleEdit = (m: MarkRow) => { setEditMark(m); setEditMarksVal(m.marks_obtained); setEditOpen(true); };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMark) return;
    const { error } = await supabase.from('marks').update({ marks_obtained: editMarksVal }).eq('id', editMark.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Marks updated' });
    setEditOpen(false);
    fetchMarks();
  };

  // Load students for assign marks
  const loadStudents = async () => {
    if (!selSubject || !selBatch) return;
    const [sbRes, profilesRes, marksRes] = await Promise.all([
      supabase.from('student_batches').select('student_id').eq('batch_id', selBatch),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('marks').select('*').eq('subject_id', selSubject).eq('batch_id', selBatch),
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

  useEffect(() => { if (selSubject && selBatch) loadStudents(); }, [selSubject, selBatch]);

  const updateStudentMark = (studentId: string, value: number) => {
    const sub = subjects.find(s => s.id === selSubject);
    const max = sub?.max_marks ?? 100;
    const clamped = Math.min(Math.max(0, value), max);
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, marks_obtained: clamped } : s));
  };

  const saveMarks = async () => {
    if (!user) return;
    setSaving(true);
    for (const s of students) {
      if (s.existing_id) {
        await supabase.from('marks').update({ marks_obtained: s.marks_obtained }).eq('id', s.existing_id);
      } else {
        await supabase.from('marks').insert({
          student_id: s.student_id, subject_id: selSubject, batch_id: selBatch,
          marks_obtained: s.marks_obtained, entered_by: user.id,
        });
      }
    }
    toast({ title: 'Marks saved successfully' });
    setSaving(false);
    fetchMarks();
  };

  const currentSub = subjects.find(s => s.id === selSubject);
  const filtered = marks.filter(m =>
    m.student_name.toLowerCase().includes(search.toLowerCase()) ||
    m.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    m.batch_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Marks Management</h1>
        <p className="page-description">Assign and manage marks across the institution</p>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Marks</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Student:</span> {editMark?.student_name}</p>
              <p><span className="text-muted-foreground">Subject:</span> {editMark?.subject_name}</p>
              <p><span className="text-muted-foreground">Batch:</span> {editMark?.batch_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Marks Obtained (max {editMark?.max_marks})</Label>
              <Input type="number" min={0} max={editMark?.max_marks} value={editMarksVal} onChange={e => setEditMarksVal(Number(e.target.value))} required />
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="assign" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assign"><Plus className="w-4 h-4 mr-1" />Assign Marks</TabsTrigger>
          <TabsTrigger value="all"><Search className="w-4 h-4 mr-1" />All Marks</TabsTrigger>
        </TabsList>

        <TabsContent value="assign">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 max-w-xs">
              <Label>Subject</Label>
              <Select value={selSubject} onValueChange={setSelSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 max-w-xs">
              <Label>Batch</Label>
              <Select value={selBatch} onValueChange={setSelBatch}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selSubject && selBatch && (
              <div className="flex items-end">
                <Button onClick={saveMarks} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save All'}
                </Button>
              </div>
            )}
          </div>
          {selSubject && selBatch && (
            <div className="border rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Marks (max: {currentSub?.max_marks})</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.student_id}>
                      <TableCell className="font-medium">{s.student_name || s.student_id}</TableCell>
                      <TableCell>
                        <Input type="number" className="w-24" min={0} max={currentSub?.max_marks}
                          value={s.marks_obtained} onChange={e => updateStudentMark(s.student_id, Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Badge className={s.marks_obtained >= (currentSub?.pass_marks ?? 40) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                          {s.marks_obtained >= (currentSub?.pass_marks ?? 40) ? 'Pass' : 'Fail'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Select a subject and batch to assign marks</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by student, subject or batch..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.student_name}</TableCell>
                    <TableCell>{m.subject_name}</TableCell>
                    <TableCell>{m.batch_name}</TableCell>
                    <TableCell>{m.marks_obtained}/{m.max_marks}</TableCell>
                    <TableCell>
                      <Badge className={m.marks_obtained >= m.pass_marks ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                        {m.marks_obtained >= m.pass_marks ? 'Pass' : 'Fail'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No marks found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
