import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, BookOpen, Layers, ClipboardList,
  BarChart3, LogOut, Menu, X, UserCog, FileText, UsersRound, KeyRound,
  Upload, CalendarCheck, CreditCard, User
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

interface NavItem { label: string; href: string; icon: ReactNode; }

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Batches', href: '/admin/batches', icon: <Layers className="w-5 h-5" /> },
  { label: 'Subjects', href: '/admin/subjects', icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Assignments', href: '/admin/assignments', icon: <UserCog className="w-5 h-5" /> },
  { label: 'Student Batches', href: '/admin/student-batches', icon: <UsersRound className="w-5 h-5" /> },
  { label: 'Marks', href: '/admin/marks', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Attendance', href: '/admin/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
  { label: 'Assignment Files', href: '/admin/assignment-uploads', icon: <Upload className="w-5 h-5" /> },
  { label: 'Fee Payments', href: '/admin/fees', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Profile', href: '/admin/profile', icon: <User className="w-5 h-5" /> },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Enter Marks', href: '/teacher/marks', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Assignments', href: '/teacher/assignments', icon: <Upload className="w-5 h-5" /> },
  { label: 'Attendance', href: '/teacher/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
  { label: 'Performance', href: '/teacher/performance', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Profile', href: '/teacher/profile', icon: <User className="w-5 h-5" /> },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'My Marks', href: '/student/marks', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Marks Certificate', href: '/student/report', icon: <FileText className="w-5 h-5" /> },
  { label: 'Assignments', href: '/student/assignments', icon: <Upload className="w-5 h-5" /> },
  { label: 'Attendance', href: '/student/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
  { label: 'Fee Payments', href: '/student/fees', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Profile', href: '/student/profile', icon: <User className="w-5 h-5" /> },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const { toast } = useToast();

  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : 'Student';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPw) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated successfully' });
      setChangePwOpen(false);
      setNewPassword('');
      setConfirmPw('');
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 sidebar-gradient flex flex-col transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <img src={logo} alt="Logo" className="w-9 h-9 rounded-lg object-contain" />
          <div>
            <h2 className="text-sm font-bold text-sidebar-primary-foreground font-display leading-tight">USMS</h2>
            <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            onClick={() => setChangePwOpen(true)}
          >
            <KeyRound className="w-4 h-4 mr-2" /> Change Password
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Change Password Dialog */}
      <Dialog open={changePwOpen} onOpenChange={setChangePwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={pwLoading}>Update Password</Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 bg-background/80 backdrop-blur-sm border-b">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
        </header>
        <div className="p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
