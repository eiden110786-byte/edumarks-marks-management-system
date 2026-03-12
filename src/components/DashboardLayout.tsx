import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, Layers, ClipboardList,
  BarChart3, LogOut, Menu, X, UserCog, FileText, UsersRound
} from 'lucide-react';

interface NavItem { label: string; href: string; icon: ReactNode; }

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Batches', href: '/admin/batches', icon: <Layers className="w-5 h-5" /> },
  { label: 'Subjects', href: '/admin/subjects', icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Assignments', href: '/admin/assignments', icon: <UserCog className="w-5 h-5" /> },
  { label: 'Student Batches', href: '/admin/student-batches', icon: <UsersRound className="w-5 h-5" /> },
  { label: 'All Marks', href: '/admin/marks', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Enter Marks', href: '/teacher/marks', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Performance', href: '/teacher/performance', icon: <BarChart3 className="w-5 h-5" /> },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'My Marks', href: '/student/marks', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Report Card', href: '/student/report', icon: <FileText className="w-5 h-5" /> },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 sidebar-gradient flex flex-col transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-primary-foreground font-display">EduMarks</h2>
            <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
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
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
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
