import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface Payment {
  id: string; challan_id: string; amount: number; semester: number;
  payment_date: string; status: string; proof_url: string; notes: string;
}

export default function StudentFees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [challanId, setChallanId] = useState('');
  const [amount, setAmount] = useState(0);
  const [semester, setSemester] = useState(1);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => { if (user) fetchPayments(); }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    const { data } = await supabase.from('fee_payments').select('*').eq('student_id', user.id).order('created_at', { ascending: false });
    setPayments((data ?? []).map(p => ({ ...p, amount: Number(p.amount) })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUploading(true); setProgress(20);
    let proofUrl = '';
    if (proofFile) {
      const path = `${user.id}/${Date.now()}-${proofFile.name}`;
      const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, proofFile);
      if (upErr) { toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);
      proofUrl = urlData.publicUrl;
    }
    setProgress(70);
    const { error } = await supabase.from('fee_payments').insert({
      student_id: user.id, challan_id: challanId, amount, semester, proof_url: proofUrl,
    });
    setProgress(100); setUploading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment submitted' });
    setCreateOpen(false); setChallanId(''); setAmount(0); setProofFile(null);
    fetchPayments();
  };

  const statusColor = (s: string) => {
    if (s === 'Verified') return 'bg-success/10 text-success';
    if (s === 'Rejected') return 'bg-destructive/10 text-destructive';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Fee Payments</h1>
          <p className="page-description">Submit and track your fee payments</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Submit Payment</Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Fee Payment</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Challan ID</Label>
              <Input value={challanId} onChange={e => setChallanId(e.target.value)} required placeholder="e.g., CH-2025-001" />
            </div>
            <div className="space-y-2">
              <Label>Amount (PKR)</Label>
              <Input type="number" min={0} value={amount} onChange={e => setAmount(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Input type="number" min={1} max={8} value={semester} onChange={e => setSemester(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>Payment Proof (optional)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
            </div>
            {uploading && <Progress value={progress} />}
            <Button type="submit" className="w-full" disabled={uploading}>{uploading ? 'Submitting...' : 'Submit'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Challan ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-medium">{p.challan_id}</TableCell>
                <TableCell>PKR {p.amount.toLocaleString()}</TableCell>
                <TableCell>{p.semester}</TableCell>
                <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {p.proof_url ? <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">View</a> : '—'}
                </TableCell>
                <TableCell><Badge className={statusColor(p.status)}>{p.status}</Badge></TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments submitted</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}
