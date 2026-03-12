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

interface StudentBatchRow {
  id: string;
  student_id: string;
  batch_id: string;
  student_name: string;
  batch_name: string;
}

export default function ManageStudentBatches() {
  const [rows, setRows] = useState<StudentBatchRow[]>([]);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<{ user_id: string; full_name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [batchId, setBatchId] = useState('');
  const { toast } = useToast();

  const fetchAll = async () => {
    const [sbRes, rolesRes, profilesRes, batchRes] = await Promise.all([
      supabase.from('student_batches').select('*'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'student'),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('batches').select('id, name'),
    ]);
    const profiles = profilesRes.data ?? [];
    const bats = batchRes.data ?? [];

    setStudents(
      (rolesRes.data ?? []).map(r => ({
        user_id: r.user_id,
        full_name: profiles.find(p => p.user_id === r.user_id)?.full_name ?? r.user_id,
      }))
    );
    setBatches(bats);
    setRows(
      (sbRes.data ?? []).map(sb => ({
        ...sb,
        student_name: profiles.find(p => p.user_id === sb.student_id)?.full_name ?? '',
        batch_name: bats.find(b => b.id === sb.batch_id)?.name ?? '',
      }))
    );
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('student_batches').insert({ student_id: studentId, batch_id: batchId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Student added to batch' });
    setOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('student_batches').delete().eq('id', id);
    toast({ title: 'Removed from batch' });
    fetchAll();
  };

  const filtered = rows.filter(r =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.batch_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Student Batches</h1>
          <p className="page-description">Assign students to batches</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add to Batch</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Student to Batch</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batch</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={!studentId || !batchId}>Assign</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by student or batch..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.student_name}</TableCell>
                <TableCell>{r.batch_name}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
