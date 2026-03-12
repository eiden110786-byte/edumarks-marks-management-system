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

interface Batch { id: string; name: string; year: number; semester: number; }

export default function ManageBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [semester, setSemester] = useState(1);
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase.from('batches').select('*').order('year', { ascending: false });
    if (data) setBatches(data);
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('batches').insert({ name, year, semester });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Batch created' });
    setOpen(false); setName('');
    fetch();
  };

  const handleEdit = (b: Batch) => {
    setEditBatch(b);
    setName(b.name);
    setYear(b.year);
    setSemester(b.semester);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatch) return;
    const { error } = await supabase.from('batches').update({ name, year, semester }).eq('id', editBatch.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Batch updated' });
    setEditOpen(false);
    fetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('batches').delete().eq('id', id);
    toast({ title: 'Batch deleted' });
    fetch();
  };

  const filtered = batches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    String(b.year).includes(search) ||
    String(b.semester).includes(search)
  );

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Manage Batches</h1>
          <p className="page-description">Create and manage student batches</p>
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setName(''); setYear(new Date().getFullYear()); setSemester(1); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Batch</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Batch</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BSCS-2K25 (Sem 3)" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Year</Label><Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Semester</Label><Input type="number" min={1} max={8} value={semester} onChange={e => setSemester(Number(e.target.value))} /></div>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Batch</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Year</Label><Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Semester</Label><Input type="number" min={1} max={8} value={semester} onChange={e => setSemester(Number(e.target.value))} /></div>
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{b.year}</TableCell>
                <TableCell>{b.semester}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(b)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No batches found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
