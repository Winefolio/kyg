import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Wine, Map, CalendarDays, Activity, CheckCircle, User, UsersRound, ChevronDown, ChevronRight, Search } from 'lucide-react';

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

interface UserDetail {
  email: string;
  soloTastings: Array<{
    id: number;
    wine_name: string;
    wine_type: string | null;
    wine_region: string | null;
    tasted_at: string;
    tasting_mode: string;
    source: 'solo';
  }>;
  groupSessions: Array<{
    id: string;
    display_name: string;
    created_at: string;
    is_host: boolean;
    short_code: string;
    session_status: string;
    package_name: string | null;
    responses_count: number;
    source: 'group';
  }>;
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

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
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

function UserDetailPanel({ email }: { email: string }) {
  const { data, isLoading, error } = useQuery<UserDetail>({
    queryKey: ['/api/admin/user', email],
    queryFn: async () => {
      const res = await fetch(`/api/admin/user/${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) return <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>;
  if (error || !data) return <div className="px-4 py-3 text-sm text-destructive">Failed to load</div>;

  const hasActivity = data.soloTastings.length > 0 || data.groupSessions.length > 0;

  if (!hasActivity) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">No tasting activity yet.</div>;
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {data.soloTastings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Solo Tastings</p>
          <div className="space-y-1">
            {data.soloTastings.map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-xs py-1">
                <span className="text-muted-foreground w-32">{formatDateTime(t.tasted_at)}</span>
                <span className="font-medium">{t.wine_name}</span>
                {t.wine_type && <Badge variant="outline" className="text-[10px] py-0">{t.wine_type}</Badge>}
                {t.wine_region && <span className="text-muted-foreground">{t.wine_region}</span>}
                <Badge variant="secondary" className="text-[10px] py-0">{t.tasting_mode}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.groupSessions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Group Sessions</p>
          <div className="space-y-1">
            {data.groupSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 text-xs py-1">
                <span className="text-muted-foreground w-32">{formatDateTime(s.created_at)}</span>
                <span className="font-medium">{s.package_name || 'Unnamed package'}</span>
                <Badge variant="outline" className="text-[10px] py-0">{s.short_code}</Badge>
                {s.is_host && <Badge variant="default" className="text-[10px] py-0">Host</Badge>}
                <span className="text-muted-foreground">{s.responses_count} responses</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [search, setSearch] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

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

  const filteredUsers = search
    ? recentUsers.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : recentUsers;

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

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 w-6"></th>
                  <th className="pb-3 font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 font-medium text-muted-foreground">Signed Up</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">
                    <User className="h-3.5 w-3.5 inline" /> Solo
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">
                    <UsersRound className="h-3.5 w-3.5 inline" /> Group
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Total</th>
                  <th className="pb-3 font-medium text-muted-foreground">Last Active</th>
                  <th className="pb-3 font-medium text-muted-foreground">Level</th>
                  <th className="pb-3 font-medium text-muted-foreground">Onboarded</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isExpanded = expandedEmail === user.email;
                  return (
                    <tr key={user.email} className="border-b last:border-0 group">
                      <td colSpan={9} className="p-0">
                        <div
                          className="flex items-center cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedEmail(isExpanded ? null : user.email)}
                        >
                          <div className="py-3 pl-2 w-6">
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </div>
                          <div className="py-3 flex-1 font-mono text-xs">{user.email}</div>
                          <div className="py-3 w-32">{formatDate(user.createdAt)}</div>
                          <div className="py-3 w-16 text-center">{user.soloTastings}</div>
                          <div className="py-3 w-16 text-center">{user.groupTastings}</div>
                          <div className="py-3 w-16 text-center font-semibold">{user.tastingsCompleted}</div>
                          <div className="py-3 w-32">{formatDate(user.lastTastingDate)}</div>
                          <div className="py-3 w-24">
                            <Badge variant={levelColor(user.tastingLevel)}>{user.tastingLevel}</Badge>
                          </div>
                          <div className="py-3 w-20 pr-2">{user.onboardingCompleted ? 'Yes' : 'No'}</div>
                        </div>
                        {isExpanded && (
                          <div className="border-t bg-muted/30">
                            <UserDetailPanel email={user.email} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
