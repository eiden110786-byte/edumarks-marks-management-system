import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarkRow {
  id: string;
  student_id: string;
  subject_id: string;
  batch_id: string;
  student_name: string;
  subject_name: string;
  batch_name: string;
  marks_obtained: number;
  max_marks: number;
  pass_marks: number;
}

export default function AdminMarks() {
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editMark, setEditMark] = useState<MarkRow | null>(null);
  const [editMarksVal, setEditMarksVal] = useState(0);
  const { toast } = useToast();

  const fetchMarks = async () => {
    const [marksRes, profilesRes, subjectsRes, batchesRes] = await Promise.all([
      supabase.from('marks').select('*'),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('subjects').select('id, name, max_marks, pass_marks'),
      supabase.from('batches').select('id, name'),
    ]);
    const profiles = profilesRes.data ?? [];
    const subjects = subjectsRes.data ?? [];
    const batches = batchesRes.data ?? [];

    setMarks((marksRes.data ?? []).map(m => {
      const sub = subjects.find(s => s.id === m.subject_id);
      return {
        id: m.id,
        student_id: m.student_id,
        subject_id: m.subject_id,
        batch_id: m.batch_id,
        student_name: profiles.find(p => p.user_id === m.student_id)?.full_name ?? '',
        subject_name: sub?.name ?? '',
        batch_name: batches.find(b => b.id === m.batch_id)?.name ?? '',
        marks_obtained: Number(m.marks_obtained),
        max_marks: sub?.max_marks ?? 100,
        pass_marks: sub?.pass_marks ?? 40,
      };
    }));
  };

  useEffect(() => { fetchMarks(); }, []);

  const handleEdit = (m: MarkRow) => {
    setEditMark(m);
    setEditMarksVal(m.marks_obtained);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMark) return;
    const { error } = await supabase.from('marks').update({ marks_obtained: editMarksVal }).eq('id', editMark.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Marks updated' });
    setEditOpen(false);
    fetchMarks();
  };

  const filtered = marks.filter(m =>
    m.student_name.toLowerCase().includes(search.toLowerCase()) ||
    m.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    m.batch_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">All Marks</h1>
        <p className="page-description">View and edit all marks across the institution</p>
      </div>

      {/* Edit Dialog */}
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
    </DashboardLayout>
  );
}
