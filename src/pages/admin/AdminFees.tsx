import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface PaymentRow {
  id: string; student_name: string; challan_id: string; amount: number;
  semester: number; payment_date: string; status: string; proof_url: string; notes: string;
}

export default function AdminFees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    const [payRes, profileRes] = await Promise.all([
      supabase.from('fee_payments').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, full_name'),
    ]);
    const profiles = profileRes.data ?? [];
    setPayments((payRes.data ?? []).map(p => ({
      ...p, amount: Number(p.amount),
      student_name: profiles.find(pr => pr.user_id === p.student_id)?.full_name ?? '',
    })));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment || !user) return;
    const { error } = await supabase.from('fee_payments').update({
      status: editStatus, notes: editNotes,
      verified_by: user.id, verified_at: new Date().toISOString(),
    }).eq('id', editPayment.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment updated' });
    setEditOpen(false);
    fetchPayments();
  };

  const filtered = payments.filter(p => {
    const matchSearch = p.student_name.toLowerCase().includes(search.toLowerCase()) ||
      p.challan_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor = (s: string) => {
    if (s === 'Verified') return 'bg-success/10 text-success';
    if (s === 'Rejected') return 'bg-destructive/10 text-destructive';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Fee Payments</h1>
        <p className="page-description">View and verify student fee payments</p>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Payment Status</DialogTitle></DialogHeader>
          <div className="text-sm space-y-1 mb-4">
            <p><span className="text-muted-foreground">Student:</span> {editPayment?.student_name}</p>
            <p><span className="text-muted-foreground">Challan:</span> {editPayment?.challan_id}</p>
            <p><span className="text-muted-foreground">Amount:</span> PKR {editPayment?.amount.toLocaleString()}</p>
          </div>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by student or challan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Challan ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.student_name}</TableCell>
                <TableCell className="font-mono">{p.challan_id}</TableCell>
                <TableCell>PKR {p.amount.toLocaleString()}</TableCell>
                <TableCell>{p.semester}</TableCell>
                <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {p.proof_url ? <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">View</a> : '—'}
                </TableCell>
                <TableCell><Badge className={statusColor(p.status)}>{p.status}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditPayment(p); setEditStatus(p.status); setEditNotes(p.notes); setEditOpen(true);
                  }}>Review</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
