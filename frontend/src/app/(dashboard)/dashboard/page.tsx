'use client';

import Link from 'next/link';
import { CheckSquare, CircleCheck, Clock, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeams } from '@/hooks/useTeam';
import { useTasks } from '@/hooks/useTasks';
import { useCountUp } from '@/hooks/useCountUp';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
}) {
  const animated = useCountUp(isLoading ? 0 : value);

  return (
    <Card className="animate-slide-up shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-2xl font-bold tabular-nums">{animated}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: teams, isLoading: teamsLoading } = useTeams();

  const firstTeamId = teams?.[0]?.id ?? '';
  const { data: firstTeamTasks, isLoading: tasksLoading } = useTasks(firstTeamId);

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    user?.user_metadata?.full_name?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'Kullanici';

  const taskStats = firstTeamTasks
    ? {
        total: firstTeamTasks.length,
        todo: firstTeamTasks.filter((task) => task.status === 'todo').length,
        inProgress: firstTeamTasks.filter((task) => task.status === 'in_progress').length,
        done: firstTeamTasks.filter((task) => task.status === 'done').length,
      }
    : { total: 0, todo: 0, inProgress: 0, done: 0 };

  const isLoading = teamsLoading || (!!firstTeamId && tasksLoading);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Merhaba, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">TaskFlow&apos;a hos geldiniz.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/teams/create">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ekip
          </Link>
        </Button>
      </div>

      {firstTeamId && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Toplam Gorev"
            value={taskStats.total}
            icon={CheckSquare}
            color="bg-primary/10 text-primary"
            isLoading={isLoading}
          />
          <StatCard
            label="Yapilacak"
            value={taskStats.todo}
            icon={Clock}
            color="bg-gray-100 text-gray-600"
            isLoading={isLoading}
          />
          <StatCard
            label="Devam Eden"
            value={taskStats.inProgress}
            icon={Clock}
            color="bg-blue-100 text-blue-600"
            isLoading={isLoading}
          />
          <StatCard
            label="Tamamlanan"
            value={taskStats.done}
            icon={CircleCheck}
            color="bg-green-100 text-green-600"
            isLoading={isLoading}
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
            {teamsLoading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-10 rounded-lg" />
                ))}
              </div>
            )}
            {!teamsLoading && (!teams || teams.length === 0) && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Henuz ekibiniz yok.</p>
                <Button asChild size="sm" className="mt-3 w-full sm:w-auto">
                  <Link href="/teams/create">Ekip Olustur</Link>
                </Button>
              </div>
            )}
            {!teamsLoading && teams && teams.length > 0 && (
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
            {[
              { href: '/tasks', icon: CheckSquare, label: 'Gorevlerim' },
              { href: '/teams/join', icon: Users, label: 'Ekibe Katil' },
              { href: '/teams/create', icon: Plus, label: 'Yeni Ekip Olustur' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex min-w-0 items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <span className="min-w-0 truncate text-sm font-medium">{label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
