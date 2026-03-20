import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wine, Map, CalendarDays, Activity, CheckCircle, User, UsersRound } from 'lucide-react';

interface EngagementData {
  summary: {
    totalUsers: number;
    usersThisWeek: number;
    usersThisMonth: number;
    totalTastings: number;
    tastingsThisWeek: number;
    tastingsThisMonth: number;
    soloTastings: number;
    groupTastings: number;
    onboardingCompletionRate: number;
  };
  recentUsers: Array<{
    email: string;
    createdAt: string;
    soloTastings: number;
    groupTastings: number;
    tastingsCompleted: number;
    lastTastingDate: string | null;
    tastingLevel: string;
    onboardingCompleted: boolean;
  }>;
  journeys: {
    activeJourneys: number;
    usersEnrolled: number;
    chapterCompletions: number;
  };
  sessions: {
    totalSessions: number;
    totalParticipants: number;
    sessionsThisMonth: number;
  };
}

function StatCard({ title, value, subtitle, icon: Icon }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function levelColor(level: string) {
  switch (level) {
    case 'intro': return 'secondary';
    case 'intermediate': return 'default';
    case 'advanced': return 'destructive';
    default: return 'outline' as const;
  }
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery<EngagementData>({
    queryKey: ['/api/admin/engagement'],
    queryFn: async () => {
      const res = await fetch('/api/admin/engagement');
      if (!res.ok) throw new Error('Failed to fetch engagement data');
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading engagement data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Failed to load data. {error?.message}</p>
      </div>
    );
  }

  const { summary, recentUsers, journeys, sessions } = data;

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Engagement Dashboard</h1>
        <p className="text-muted-foreground mt-1">Are people using this thing?</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={summary.totalUsers}
          subtitle={`${summary.usersThisWeek} this week / ${summary.usersThisMonth} this month`}
          icon={Users}
        />
        <StatCard
          title="Total Tastings"
          value={summary.totalTastings}
          subtitle={`${summary.soloTastings} solo + ${summary.groupTastings} group`}
          icon={Wine}
        />
        <StatCard
          title="Onboarding Rate"
          value={`${summary.onboardingCompletionRate}%`}
          subtitle="Users who completed onboarding"
          icon={CheckCircle}
        />
        <StatCard
          title="Tastings / User"
          value={summary.totalUsers > 0 ? (summary.totalTastings / summary.totalUsers).toFixed(1) : '0'}
          subtitle={`${summary.tastingsThisWeek} this week / ${summary.tastingsThisMonth} this month`}
          icon={Activity}
        />
      </div>

      {/* Journey & Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Active Journeys"
          value={journeys.activeJourneys}
          subtitle={`${journeys.usersEnrolled} users enrolled`}
          icon={Map}
        />
        <StatCard
          title="Chapter Completions"
          value={journeys.chapterCompletions}
          icon={CheckCircle}
        />
        <StatCard
          title="Group Sessions"
          value={sessions.totalSessions}
          subtitle={`${sessions.totalParticipants} participants / ${sessions.sessionsThisMonth} this month`}
          icon={CalendarDays}
        />
      </div>

      {/* Recent Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 font-medium text-muted-foreground">Signed Up</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center" title="Solo tastings">
                    <User className="h-3.5 w-3.5 inline" /> Solo
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-center" title="Group tastings">
                    <UsersRound className="h-3.5 w-3.5 inline" /> Group
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Total</th>
                  <th className="pb-3 font-medium text-muted-foreground">Last Active</th>
                  <th className="pb-3 font-medium text-muted-foreground">Level</th>
                  <th className="pb-3 font-medium text-muted-foreground">Onboarded</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.email} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">{user.email}</td>
                    <td className="py-3">{formatDate(user.createdAt)}</td>
                    <td className="py-3 text-center">{user.soloTastings}</td>
                    <td className="py-3 text-center">{user.groupTastings}</td>
                    <td className="py-3 text-center font-semibold">{user.tastingsCompleted}</td>
                    <td className="py-3">{formatDate(user.lastTastingDate)}</td>
                    <td className="py-3">
                      <Badge variant={levelColor(user.tastingLevel)}>{user.tastingLevel}</Badge>
                    </td>
                    <td className="py-3">{user.onboardingCompleted ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
