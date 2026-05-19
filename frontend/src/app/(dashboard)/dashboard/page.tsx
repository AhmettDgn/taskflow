import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckSquare, CircleCheck, Clock, Plus, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadDashboardPageData } from '@/lib/dashboard';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  icon,
  color,
  testId,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  testId: string;
}) {
  return (
    <Card
      className="shadow-card transition-shadow duration-200 hover:shadow-card-hover"
      data-testid={testId}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

const quickLinks = [
  {
    href: '/tasks',
    label: 'Gorevlerim',
    icon: <CheckSquare className="h-4 w-4 text-gray-600" />,
  },
  {
    href: '/teams/join',
    label: 'Ekibe Katil',
    icon: <Users className="h-4 w-4 text-gray-600" />,
  },
  {
    href: '/teams/create',
    label: 'Yeni Ekip Olustur',
    icon: <Plus className="h-4 w-4 text-gray-600" />,
  },
] as const;

export default async function DashboardPage() {
  const supabase = createClient();
  const dashboardData = await loadDashboardPageData(supabase as never);

  if ('redirectTo' in dashboardData) {
    redirect(dashboardData.redirectTo);
  }

  const { firstName, firstTeamId, taskStats, teams } = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" data-testid="dashboard-heading">
            Merhaba, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">TaskFlow&apos;a hos geldiniz.</p>
        </div>
        <Link
          href="/teams/create"
          className={cn(buttonVariants(), 'w-full sm:w-auto')}
        >
          <Plus className="mr-2 h-4 w-4" />
          <span data-testid="dashboard-new-team">Yeni Ekip</span>
        </Link>
      </div>

      {firstTeamId && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Toplam Gorev"
            value={taskStats.total}
            icon={<CheckSquare className="h-4 w-4" />}
            color="bg-primary/10 text-primary"
            testId="dashboard-stat-total"
          />
          <StatCard
            label="Yapilacak"
            value={taskStats.todo}
            icon={<Clock className="h-4 w-4" />}
            color="bg-gray-100 text-gray-600"
            testId="dashboard-stat-todo"
          />
          <StatCard
            label="Devam Eden"
            value={taskStats.inProgress}
            icon={<Clock className="h-4 w-4" />}
            color="bg-blue-100 text-blue-600"
            testId="dashboard-stat-in-progress"
          />
          <StatCard
            label="Tamamlanan"
            value={taskStats.done}
            icon={<CircleCheck className="h-4 w-4" />}
            color="bg-green-100 text-green-600"
            testId="dashboard-stat-done"
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Ekiplerim</CardTitle>
            <Link href="/teams" className="text-xs text-muted-foreground hover:text-primary">
              Tumunu gor
            </Link>
          </CardHeader>
          <CardContent>
            {teams.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Henuz ekibiniz yok.</p>
                <Link
                  href="/teams/create"
                  className={cn(buttonVariants({ size: 'sm' }), 'mt-3 inline-flex w-full sm:w-auto')}
                >
                  Ekip Olustur
                </Link>
              </div>
            )}

            {teams.length > 0 && (
              <div className="space-y-2">
                {teams.slice(0, 5).map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}/board`}
                    className="flex min-w-0 items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="min-w-0 truncate text-sm font-medium">{team.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Hizli Erisim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex min-w-0 items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">{icon}</div>
                <span className="min-w-0 truncate text-sm font-medium">{label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
