import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  batch_id: string;
  teacher_name: string;
  subject_name: string;
  batch_name: string;
}

export default function ManageAssignments() {
  const [assignments, setAssignments] = useState<TeacherSubject[]>([]);
  const [search, setSearch] = useState('');
  const [teachers, setTeachers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [batchId, setBatchId] = useState('');
  const { toast } = useToast();

  const fetchAll = async () => {
    const [tsRes, rolesRes, profilesRes, subRes, batchRes] = await Promise.all([
      supabase.from('teacher_subjects').select('*'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'teacher'),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('batches').select('id, name'),
    ]);

    const profiles = profilesRes.data ?? [];
    const subs = subRes.data ?? [];
    const bats = batchRes.data ?? [];

    setTeachers(
      (rolesRes.data ?? []).map(r => ({
        user_id: r.user_id,
        full_name: profiles.find(p => p.user_id === r.user_id)?.full_name ?? r.user_id,
      }))
    );
    setSubjects(subs);
    setBatches(bats);

    setAssignments(
      (tsRes.data ?? []).map(ts => ({
        ...ts,
        teacher_name: profiles.find(p => p.user_id === ts.teacher_id)?.full_name ?? '',
        subject_name: subs.find(s => s.id === ts.subject_id)?.name ?? '',
        batch_name: bats.find(b => b.id === ts.batch_id)?.name ?? '',
      }))
    );
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('teacher_subjects').insert({ teacher_id: teacherId, subject_id: subjectId, batch_id: batchId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Assignment created' });
    setOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('teacher_subjects').delete().eq('id', id);
    toast({ title: 'Assignment removed' });
    fetchAll();
  };

  const filtered = assignments.filter(a =>
    a.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
    a.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    a.batch_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Subject Assignments</h1>
          <p className="page-description">Assign subjects to teachers for specific batches</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Assign</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Subject to Teacher</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>{teachers.map(t => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batch</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={!teacherId || !subjectId || !batchId}>Assign</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by teacher, subject or batch..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.teacher_name}</TableCell>
                <TableCell>{a.subject_name}</TableCell>
                <TableCell>{a.batch_name}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No assignments found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
