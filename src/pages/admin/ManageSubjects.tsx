import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Search, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Subject { id: string; name: string; code: string; max_marks: number; pass_marks: number; }

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(40);
  const { toast } = useToast();

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  };
  useEffect(() => { fetchSubjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('subjects').insert({ name, code, max_marks: maxMarks, pass_marks: passMarks });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Subject created' });
    setOpen(false); setName(''); setCode('');
    fetchSubjects();
  };

  const handleEdit = (s: Subject) => {
    setEditSubject(s);
    setName(s.name);
    setCode(s.code);
    setMaxMarks(s.max_marks);
    setPassMarks(s.pass_marks);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject) return;
    const { error } = await supabase.from('subjects').update({ name, code, max_marks: maxMarks, pass_marks: passMarks }).eq('id', editSubject.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Subject updated' });
    setEditOpen(false);
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
    toast({ title: 'Subject deleted' });
    fetchSubjects();
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Manage Subjects</h1>
          <p className="page-description">Create and manage subjects</p>
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setName(''); setCode(''); setMaxMarks(100); setPassMarks(40); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Subject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Subject</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Mathematics" required /></div>
              <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="MATH101" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Max Marks</Label><Input type="number" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Pass Marks</Label><Input type="number" value={passMarks} onChange={e => setPassMarks(Number(e.target.value))} /></div>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Subject</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={e => setCode(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Max Marks</Label><Input type="number" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Pass Marks</Label><Input type="number" value={passMarks} onChange={e => setPassMarks(Number(e.target.value))} /></div>
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Max Marks</TableHead>
              <TableHead>Pass Marks</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.code}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.max_marks}</TableCell>
                <TableCell>{s.pass_marks}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No subjects found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
