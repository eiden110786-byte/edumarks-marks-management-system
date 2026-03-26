import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface UploadRow {
  id: string; title: string; teacher_name: string; subject_name: string;
  batch_name: string; file_url: string; file_name: string; due_date: string | null;
  submissions_count: number;
}

export default function AdminAssignmentUploads() {
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUploads(); }, []);

  const fetchUploads = async () => {
    const [upRes, profRes, subRes, batchRes, submRes] = await Promise.all([
      supabase.from('assignment_uploads').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name'),
      supabase.from('subjects').select('*'),
      supabase.from('batches').select('*'),
      supabase.from('assignment_submissions').select('assignment_id'),
    ]);
    const profiles = profRes.data ?? [];
    const subs = subRes.data ?? [];
    const bats = batchRes.data ?? [];
    const submissions = submRes.data ?? [];
    setUploads((upRes.data ?? []).map(u => ({
      id: u.id, title: u.title,
      teacher_name: profiles.find(p => p.user_id === u.teacher_id)?.full_name ?? '',
      subject_name: subs.find(s => s.id === u.subject_id)?.name ?? '',
      batch_name: bats.find(b => b.id === u.batch_id)?.name ?? '',
      file_url: u.file_url, file_name: u.file_name, due_date: u.due_date,
      submissions_count: submissions.filter(s => s.assignment_id === u.id).length,
    })));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('assignment_uploads').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Assignment deleted' });
    fetchUploads();
  };

  const filtered = uploads.filter(u =>
    u.title.toLowerCase().includes(search.toLowerCase()) ||
    u.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
    u.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">All Assignments</h1>
        <p className="page-description">Manage all assignments and submissions</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search assignments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.title}</TableCell>
                <TableCell>{u.teacher_name}</TableCell>
                <TableCell>{u.subject_name}</TableCell>
                <TableCell>{u.batch_name}</TableCell>
                <TableCell>{u.due_date ? new Date(u.due_date).toLocaleDateString() : '—'}</TableCell>
                <TableCell><Badge variant="outline">{u.submissions_count}</Badge></TableCell>
                <TableCell>
                  <a href={u.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    <Download className="w-3 h-3" />{u.file_name}
                  </a>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No assignments found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
