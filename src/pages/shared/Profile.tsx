import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (data) {
        setFullName(data.full_name);
        setEmail(data.email);
        setPhone(data.phone ?? '');
        setRollNumber((data as any).roll_number ?? '');
        setAvatarUrl((data as any).avatar_url ?? '');
      }
    };
    fetch();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('profile-pictures').upload(path, file);
    if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl } as any).eq('user_id', user.id);
    setUploading(false);
    toast({ title: 'Photo updated' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, phone, roll_number: rollNumber,
    } as any).eq('user_id', user.id);
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profile updated' });
  };

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-description">View and edit your profile information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="relative group">
              <Avatar className="w-28 h-28">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl"><User className="w-10 h-10" /></AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-background" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{fullName || 'N/A'}</h3>
            <p className="text-sm text-muted-foreground">{email}</p>
            <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{roleLabel}</span>
            {rollNumber && <p className="mt-2 text-sm text-muted-foreground">Roll #: {rollNumber}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Edit Profile</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" />
                </div>
                {role === 'student' && (
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g., BSCS-2K25-001" />
                  </div>
                )}
              </div>
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
