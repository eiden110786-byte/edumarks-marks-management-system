import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface AssignmentView {
  id: string; title: string; description: string; subject_name: string; batch_name: string;
  file_url: string; file_name: string; due_date: string | null;
  submission_status: string; submission_marks: number | null; submission_feedback: string;
}

export default function StudentAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => { if (user) fetchAssignments(); }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;
    const [sbRes, assignRes, subRes, batchRes, submRes] = await Promise.all([
      supabase.from('student_batches').select('batch_id').eq('student_id', user.id),
      supabase.from('assignment_uploads').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('batches').select('*'),
      supabase.from('assignment_submissions').select('*').eq('student_id', user.id),
    ]);
    const batchIds = (sbRes.data ?? []).map(sb => sb.batch_id);
    const subs = subRes.data ?? [];
    const bats = batchRes.data ?? [];
    const submissions = submRes.data ?? [];
    const filtered = (assignRes.data ?? []).filter(a => batchIds.includes(a.batch_id));
    setAssignments(filtered.map(a => {
      const sub = submissions.find(s => s.assignment_id === a.id);
      return {
        id: a.id, title: a.title, description: a.description,
        subject_name: subs.find(s => s.id === a.subject_id)?.name ?? '',
        batch_name: bats.find(b => b.id === a.batch_id)?.name ?? '',
        file_url: a.file_url, file_name: a.file_name, due_date: a.due_date,
        submission_status: sub?.status ?? 'Pending',
        submission_marks: sub?.marks ? Number(sub.marks) : null,
        submission_feedback: sub?.feedback ?? '',
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
      toast({ title: 'Invalid file', description: 'Only PDF, DOC, DOCX allowed', variant: 'destructive' });
      return;
    }
    setUploading(true); setProgress(30);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('submissions').upload(path, file);
    setProgress(70);
    if (upErr) { toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);
    setProgress(90);
    const { error } = await supabase.from('assignment_submissions').insert({
      assignment_id: selectedId, student_id: user.id,
      file_url: urlData.publicUrl, file_name: file.name, status: 'Submitted',
    });
    setProgress(100); setUploading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Assignment submitted' });
    setSubmitOpen(false); setFile(null);
    fetchAssignments();
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Assignments</h1>
        <p className="page-description">View and submit assignments</p>
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Assignment</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>File (PDF, DOC, DOCX)</Label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)} required />
            </div>
            {uploading && <Progress value={progress} />}
            <Button type="submit" className="w-full" disabled={uploading}>{uploading ? 'Uploading...' : 'Submit'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Download</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell>{a.subject_name}</TableCell>
                <TableCell>{a.batch_name}</TableCell>
                <TableCell>{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</TableCell>
                <TableCell>
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />Download
                  </a>
                </TableCell>
                <TableCell>
                  <Badge className={
                    a.submission_status === 'Reviewed' ? 'bg-success/10 text-success' :
                    a.submission_status === 'Submitted' ? 'bg-primary/10 text-primary' :
                    'bg-muted text-muted-foreground'
                  }>{a.submission_status}</Badge>
                </TableCell>
                <TableCell>{a.submission_marks ?? '—'}</TableCell>
                <TableCell>
                  {a.submission_status === 'Pending' && (
                    <Button size="sm" onClick={() => { setSelectedId(a.id); setSubmitOpen(true); }}>
                      <Upload className="w-4 h-4 mr-1" />Submit
                    </Button>
                  )}
                  {a.submission_feedback && (
                    <span className="text-xs text-muted-foreground ml-2" title={a.submission_feedback}>📝 Feedback</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No assignments available</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
