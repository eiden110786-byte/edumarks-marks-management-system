import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Plus, Eye, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Assignment {
  id: string; title: string; description: string; subject_name: string; batch_name: string;
  file_url: string; file_name: string; due_date: string | null; created_at: string;
  subject_id: string; batch_id: string;
}

interface Submission {
  id: string; student_name: string; file_url: string; file_name: string;
  status: string; marks: number | null; feedback: string; submitted_at: string;
  student_id: string;
}

export default function TeacherAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<{ subject_id: string; batch_id: string; subject_name: string; batch_name: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewSub, setReviewSub] = useState<Submission | null>(null);
  const [reviewMarks, setReviewMarks] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubBatch, setSelectedSubBatch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [tsRes, subRes, batchRes, assignRes] = await Promise.all([
      supabase.from('teacher_subjects').select('*').eq('teacher_id', user.id),
      supabase.from('subjects').select('*'),
      supabase.from('batches').select('*'),
      supabase.from('assignment_uploads').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
    ]);
    const subs = subRes.data ?? [];
    const bats = batchRes.data ?? [];
    setTeacherSubjects((tsRes.data ?? []).map(ts => ({
      subject_id: ts.subject_id, batch_id: ts.batch_id,
      subject_name: subs.find(s => s.id === ts.subject_id)?.name ?? '',
      batch_name: bats.find(b => b.id === ts.batch_id)?.name ?? '',
    })));
    setAssignments((assignRes.data ?? []).map(a => ({
      ...a, subject_name: subs.find(s => s.id === a.subject_id)?.name ?? '',
      batch_name: bats.find(b => b.id === a.batch_id)?.name ?? '',
    })));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    const [subId, batchId] = selectedSubBatch.split('|');
    const ext = file.name.split('.').pop();
    const allowed = ['pdf', 'doc', 'docx'];
    if (!ext || !allowed.includes(ext.toLowerCase())) {
      toast({ title: 'Invalid file type', description: 'Only PDF, DOC, DOCX allowed', variant: 'destructive' });
      return;
    }
    setUploading(true);
    setUploadProgress(30);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('assignments').upload(path, file);
    setUploadProgress(70);
    if (upErr) { toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(path);
    setUploadProgress(90);
    const { error } = await supabase.from('assignment_uploads').insert({
      title, description, subject_id: subId, batch_id: batchId, teacher_id: user.id,
      file_url: urlData.publicUrl, file_name: file.name,
      due_date: dueDate || null,
    });
    setUploadProgress(100);
    setUploading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Assignment uploaded' });
    setCreateOpen(false);
    setTitle(''); setDescription(''); setFile(null); setDueDate(''); setSelectedSubBatch('');
    fetchData();
  };

  const viewSubmissions = async (a: Assignment) => {
    setSelectedAssignment(a);
    const [subRes, profileRes] = await Promise.all([
      supabase.from('assignment_submissions').select('*').eq('assignment_id', a.id),
      supabase.from('profiles').select('user_id, full_name'),
    ]);
    const profiles = profileRes.data ?? [];
    setSubmissions((subRes.data ?? []).map(s => ({
      ...s, student_name: profiles.find(p => p.user_id === s.student_id)?.full_name ?? '',
      marks: s.marks ? Number(s.marks) : null,
    })));
    setViewOpen(true);
  };

  const openReview = (s: Submission) => {
    setReviewSub(s);
    setReviewMarks(s.marks ?? 0);
    setReviewFeedback(s.feedback || '');
    setReviewOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSub) return;
    const { error } = await supabase.from('assignment_submissions').update({
      marks: reviewMarks, feedback: reviewFeedback, status: 'Reviewed', reviewed_at: new Date().toISOString(),
    }).eq('id', reviewSub.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Review submitted' });
    setReviewOpen(false);
    if (selectedAssignment) viewSubmissions(selectedAssignment);
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-description">Upload assignments and review submissions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Assignment</Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Assignment</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject & Batch</Label>
              <Select value={selectedSubBatch} onValueChange={setSelectedSubBatch}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {teacherSubjects.map(ts => (
                    <SelectItem key={`${ts.subject_id}|${ts.batch_id}`} value={`${ts.subject_id}|${ts.batch_id}`}>
                      {ts.subject_name} — {ts.batch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>File (PDF, DOC, DOCX)</Label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)} required />
            </div>
            {uploading && <Progress value={uploadProgress} />}
            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Assignment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Submissions Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submissions — {selectedAssignment?.title}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.student_name}</TableCell>
                  <TableCell>
                    <a href={s.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" />{s.file_name}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge className={s.status === 'Reviewed' ? 'bg-success/10 text-success' : s.status === 'Submitted' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.marks ?? '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openReview(s)}>
                      <MessageSquare className="w-4 h-4 mr-1" />Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No submissions yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Submission</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Student: {reviewSub?.student_name}</p>
          <form onSubmit={submitReview} className="space-y-4">
            <div className="space-y-2">
              <Label>Marks</Label>
              <Input type="number" min={0} value={reviewMarks} onChange={e => setReviewMarks(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Feedback</Label>
              <Textarea value={reviewFeedback} onChange={e => setReviewFeedback(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Submit Review</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assignments List */}
      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Actions</TableHead>
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
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">{a.file_name}</a>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => viewSubmissions(a)}>
                    <Eye className="w-4 h-4 mr-1" />Submissions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No assignments uploaded yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
