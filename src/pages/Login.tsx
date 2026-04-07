import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, ArrowLeft, UserPlus, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo-login.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [signUpMode, setSignUpMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [batches, setBatches] = useState<{ id: string; name: string; semester: number; year: number }[]>([]);
  const { signIn, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (signUpMode) {
      supabase.from('batches').select('id, name, semester, year').then(({ data }) => {
        if (data) setBatches(data);
      });
    }
  }, [signUpMode]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Profile picture must be under 2MB', variant: 'destructive' });
        return;
      }
      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (!selectedBatch) {
      toast({ title: 'Error', description: 'Please select a batch', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // Sign up with student role and self_registration flag
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          requested_role: 'student',
          self_registration: 'true',
        },
      },
    });

    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      // Upload profile picture if provided
      if (profilePic) {
        const ext = profilePic.name.split('.').pop();
        const path = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(path, profilePic, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(path);
          // Update profile with avatar, phone, roll_number - wait a moment for trigger
          setTimeout(async () => {
            await supabase.from('profiles').update({
              avatar_url: urlData.publicUrl,
              phone,
              roll_number: rollNumber,
            }).eq('user_id', userId);

            // Add student to batch
            if (selectedBatch) {
              await supabase.from('student_batches').insert({ student_id: userId, batch_id: selectedBatch });
            }
          }, 1500);
        }
      } else {
        setTimeout(async () => {
          await supabase.from('profiles').update({
            phone,
            roll_number: rollNumber,
          }).eq('user_id', userId);

          if (selectedBatch) {
            await supabase.from('student_batches').insert({ student_id: userId, batch_id: selectedBatch });
          }
        }, 1500);
      }
    }

    // Sign out immediately since they need approval
    await supabase.auth.signOut();

    toast({
      title: 'Registration submitted',
      description: 'Your account has been submitted for approval. You will be notified once an admin approves your account.',
    });
    setSignUpMode(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setRollNumber('');
    setSelectedBatch('');
    setProfilePic(null);
    setProfilePicPreview(null);
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email sent', description: 'Check your inbox for the password reset link.' });
      setForgotMode(false);
    }
  };

  if (role) {
    navigate(`/${role}`, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="USMS Logo" className="h-24 mb-3" />
          <h1 className="text-lg font-bold text-center px-[50px]" style={{ color: 'hsl(220, 70%, 45%)' }}>
            UNIVERSITY OF SUFISM &amp; MODERN SCIENCES BHIT SHAH
          </h1>
          <p className="text-sm font-normal text-center text-muted-foreground mt-1">
            Grade and Academic Record Management System
          </p>
        </div>

        <Card>
          {forgotMode ? (
            <>
              <CardHeader>
                <CardTitle className="text-xl">Reset Password</CardTitle>
                <CardDescription>Enter your email to receive a reset link</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" /> : null}
                    Send Reset Link
                  </Button>
                </form>
                <Button variant="ghost" className="w-full mt-2" onClick={() => setForgotMode(false)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
              </CardContent>
            </>
          ) : signUpMode ? (
            <>
              <CardHeader>
                <CardTitle className="text-xl">Student Registration</CardTitle>
                <CardDescription>Create your student account (requires admin approval)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-3">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                      {profilePicPreview ? (
                        <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <Label htmlFor="profile-pic" className="text-xs text-primary cursor-pointer hover:underline">
                      Upload Profile Picture
                    </Label>
                    <input id="profile-pic" type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Full Name *</Label>
                    <Input id="signup-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-roll">Roll Number</Label>
                      <Input id="signup-roll" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. 2024-CS-001" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-phone">Phone</Label>
                      <Input id="signup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-batch">Batch *</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} (Sem {b.semester}, {b.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-confirm">Confirm Password *</Label>
                    <Input id="signup-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Submit Registration
                  </Button>
                </form>
                <p className="text-sm text-center text-muted-foreground mt-3">
                  Already have an account?{' '}
                  <button type="button" className="text-primary hover:underline" onClick={() => { setSignUpMode(false); setPassword(''); setConfirmPassword(''); }}>
                    Sign In
                  </button>
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                      Sign In
                    </Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSignUpMode(true)}>
                      <UserPlus className="w-4 h-4 mr-2" /> Sign Up
                    </Button>
                  </div>
                </form>
                <button type="button" className="text-sm text-primary hover:underline w-full text-center mt-3" onClick={() => setForgotMode(true)}>
                  Forgot password?
                </button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
