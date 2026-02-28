import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface MarkRow {
  id: string;
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

  useEffect(() => {
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
          student_name: profiles.find(p => p.user_id === m.student_id)?.full_name ?? '',
          subject_name: sub?.name ?? '',
          batch_name: batches.find(b => b.id === m.batch_id)?.name ?? '',
          marks_obtained: Number(m.marks_obtained),
          max_marks: sub?.max_marks ?? 100,
          pass_marks: sub?.pass_marks ?? 40,
        };
      }));
    };
    fetchMarks();
  }, []);

  const filtered = marks.filter(m =>
    m.student_name.toLowerCase().includes(search.toLowerCase()) ||
    m.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    m.batch_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">All Marks</h1>
        <p className="page-description">View all marks across the institution</p>
      </div>

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
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No marks found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
