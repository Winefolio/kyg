import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Wine, Map, CalendarDays, Activity, CheckCircle, User, UsersRound, ChevronDown, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortKey = 'email' | 'createdAt' | 'soloTastings' | 'groupTastings'
  | 'tastingsCompleted' | 'lastTastingDate' | 'lastSeenAt' | 'tastingLevel' | 'onboardingCompleted';
type SortDir = 'asc' | 'desc';

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
    lastSeenAt: string | null;
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

function SortIcon({ sortKey: currentSort, sortDir, columnKey }: {
  sortKey: SortKey;
  sortDir: SortDir;
  columnKey: SortKey;
}) {
  if (currentSort !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 inline" />
    : <ArrowDown className="h-3 w-3 ml-1 inline" />;
}

export default function AdminDashboard() {
  const [search, setSearch] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [levelFilter, setLevelFilter] = useState('');
  const [onboardedFilter, setOnboardedFilter] = useState('');

  const { data, isLoading, error } = useQuery<EngagementData>({
    queryKey: ['/api/admin/engagement'],
    queryFn: async () => {
      const res = await fetch('/api/admin/engagement');
      if (!res.ok) throw new Error('Failed to fetch engagement data');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedUsers = useMemo(() => {
    if (!data) return [];

    let users = data.recentUsers;

    // Apply filters
    if (search) {
      users = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));
    }
    if (levelFilter) {
      users = users.filter(u => u.tastingLevel === levelFilter);
    }
    if (onboardedFilter) {
      users = users.filter(u =>
        onboardedFilter === 'yes' ? u.onboardingCompleted : !u.onboardingCompleted
      );
    }

    // Sort
    return [...users].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      switch (sortKey) {
        case 'email':
          return dir * a.email.localeCompare(b.email);
        case 'createdAt':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'soloTastings':
          return dir * (a.soloTastings - b.soloTastings);
        case 'groupTastings':
          return dir * (a.groupTastings - b.groupTastings);
        case 'tastingsCompleted':
          return dir * (a.tastingsCompleted - b.tastingsCompleted);
        case 'lastTastingDate': {
          if (!a.lastTastingDate && !b.lastTastingDate) return 0;
          if (!a.lastTastingDate) return 1;
          if (!b.lastTastingDate) return -1;
          return dir * (new Date(a.lastTastingDate).getTime() - new Date(b.lastTastingDate).getTime());
        }
        case 'lastSeenAt': {
          if (!a.lastSeenAt && !b.lastSeenAt) return 0;
          if (!a.lastSeenAt) return 1;
          if (!b.lastSeenAt) return -1;
          return dir * (new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime());
        }
        case 'tastingLevel': {
          const order: Record<string, number> = { intro: 0, intermediate: 1, advanced: 2 };
          return dir * ((order[a.tastingLevel] ?? -1) - (order[b.tastingLevel] ?? -1));
        }
        case 'onboardingCompleted':
          return dir * (Number(a.onboardingCompleted) - Number(b.onboardingCompleted));
        default:
          return 0;
      }
    });
  }, [data, search, levelFilter, onboardedFilter, sortKey, sortDir]);

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

  const { summary, journeys, sessions } = data;

  const thClass = "pb-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors";

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
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Users ({sortedUsers.length})</CardTitle>
          <div className="flex items-center gap-3">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All levels</option>
              <option value="intro">Intro</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <select
              value={onboardedFilter}
              onChange={(e) => setOnboardedFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All users</option>
              <option value="yes">Onboarded</option>
              <option value="no">Not onboarded</option>
            </select>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 w-8"></th>
                  <th className={thClass} onClick={() => handleSort('email')}>
                    Email <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="email" />
                  </th>
                  <th className={thClass} onClick={() => handleSort('createdAt')}>
                    Signed Up <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="createdAt" />
                  </th>
                  <th className={`${thClass} text-center`} onClick={() => handleSort('soloTastings')}>
                    <User className="h-3.5 w-3.5 inline" /> Solo
                    <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="soloTastings" />
                  </th>
                  <th className={`${thClass} text-center`} onClick={() => handleSort('groupTastings')}>
                    <UsersRound className="h-3.5 w-3.5 inline" /> Group
                    <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="groupTastings" />
                  </th>
                  <th className={`${thClass} text-center`} onClick={() => handleSort('tastingsCompleted')}>
                    Total <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="tastingsCompleted" />
                  </th>
                  <th className={thClass} onClick={() => handleSort('lastTastingDate')}>
                    Last Tasting <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="lastTastingDate" />
                  </th>
                  <th className={thClass} onClick={() => handleSort('lastSeenAt')}>
                    Last Seen <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="lastSeenAt" />
                  </th>
                  <th className={thClass} onClick={() => handleSort('tastingLevel')}>
                    Level <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="tastingLevel" />
                  </th>
                  <th className={thClass} onClick={() => handleSort('onboardingCompleted')}>
                    Onboarded <SortIcon sortKey={sortKey} sortDir={sortDir} columnKey="onboardingCompleted" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => {
                  const isExpanded = expandedEmail === user.email;
                  return (
                    <React.Fragment key={user.email}>
                      <tr
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedEmail(isExpanded ? null : user.email)}
                      >
                        <td className="py-3 pl-2 w-8">
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                        </td>
                        <td className="py-3 font-mono text-xs">{user.email}</td>
                        <td className="py-3">{formatDate(user.createdAt)}</td>
                        <td className="py-3 text-center">{user.soloTastings}</td>
                        <td className="py-3 text-center">{user.groupTastings}</td>
                        <td className="py-3 text-center font-semibold">{user.tastingsCompleted}</td>
                        <td className="py-3">{formatDate(user.lastTastingDate)}</td>
                        <td className="py-3">{formatDate(user.lastSeenAt)}</td>
                        <td className="py-3">
                          <Badge variant={levelColor(user.tastingLevel)}>{user.tastingLevel}</Badge>
                        </td>
                        <td className="py-3">{user.onboardingCompleted ? 'Yes' : 'No'}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="bg-muted/30 p-0 border-b">
                            <UserDetailPanel email={user.email} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
