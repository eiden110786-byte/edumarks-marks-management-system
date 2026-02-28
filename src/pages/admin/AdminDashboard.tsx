import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, Layers, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(220,70%,50%)', 'hsl(165,60%,40%)', 'hsl(38,92%,50%)', 'hsl(280,65%,60%)', 'hsl(0,72%,51%)'];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, batches: 0, subjects: 0 });
  const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [profiles, roles, batches, subjects] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('role'),
        supabase.from('batches').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
      ]);
      const teachers = roles.data?.filter(r => r.role === 'teacher').length ?? 0;
      const students = roles.data?.filter(r => r.role === 'student').length ?? 0;
      const admins = roles.data?.filter(r => r.role === 'admin').length ?? 0;
      setStats({
        users: profiles.count ?? 0,
        teachers,
        students,
        batches: batches.count ?? 0,
        subjects: subjects.count ?? 0,
      });
      setRoleData([
        { name: 'Admins', value: admins },
        { name: 'Teachers', value: teachers },
        { name: 'Students', value: students },
      ]);
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-description">Overview of your institution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Users" value={stats.users} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Teachers" value={stats.teachers} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Students" value={stats.students} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Batches" value={stats.batches} icon={<Layers className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-display">User Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Quick Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Subjects', count: stats.subjects },
                  { name: 'Batches', count: stats.batches },
                  { name: 'Teachers', count: stats.teachers },
                  { name: 'Students', count: stats.students },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(220,70%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
