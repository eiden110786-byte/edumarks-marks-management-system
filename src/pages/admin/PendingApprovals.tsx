import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface PendingStudent {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  roll_number: string | null;
  avatar_url: string | null;
  approval_status: string;
  created_at: string;
  batch_name?: string;
}

export default function PendingApprovals() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPending = async () => {
    // Get all student profiles that are pending
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending');

    if (!profiles || profiles.length === 0) {
      setStudents([]);
      return;
    }

    // Get batch info for these students
    const userIds = profiles.map(p => p.user_id);
    const { data: studentBatches } = await supabase
      .from('student_batches')
      .select('student_id, batch_id')
      .in('student_id', userIds);

    const { data: batches } = await supabase.from('batches').select('id, name, semester, year');

    const result: PendingStudent[] = profiles.map(p => {
      const sb = studentBatches?.find(sb => sb.student_id === p.user_id);
      const batch = batches?.find(b => b.id === sb?.batch_id);
      return {
        ...p,
        batch_name: batch ? `${batch.name} (Sem ${batch.semester}, ${batch.year})` : '—',
      };
    });

    setStudents(result);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (studentUserId: string, action: 'approve' | 'reject') => {
    setLoading(studentUserId);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('approve-student', {
      body: { student_user_id: studentUserId, action },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({
        title: action === 'approve' ? 'Student Approved' : 'Student Rejected',
        description: action === 'approve'
          ? 'The student can now sign in to their account.'
          : 'The student registration has been rejected.',
      });
    }
    setLoading(null);
    fetchPending();
  };

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.roll_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-description">Review and approve student registrations</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, email or roll number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roll No.</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s.user_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={s.avatar_url || ''} />
                      <AvatarFallback>{s.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{s.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.roll_number || '—'}</TableCell>
                <TableCell>{s.phone || '—'}</TableCell>
                <TableCell>{s.batch_name}</TableCell>
                <TableCell>
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" disabled={loading === s.user_id} onClick={() => handleAction(s.user_id, 'approve')}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" disabled={loading === s.user_id} onClick={() => handleAction(s.user_id, 'reject')}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No pending approvals
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
