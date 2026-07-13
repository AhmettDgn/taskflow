import type { TaskStatus, Team } from '@/lib/types';

export type TaskStatKey = 'total' | 'todo' | 'inProgress' | 'done';

export interface DashboardUserLike {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null } | null;
}

export interface DashboardPageData {
  firstName: string;
  teams: Team[];
  firstTeamId: string;
  taskStats: Record<TaskStatKey, number>;
}

export interface DashboardRedirectResult {
  redirectTo: '/login';
}

export function getFirstName(user: Pick<DashboardUserLike, 'email' | 'user_metadata'>) {
  return user.user_metadata?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Kullanici';
}

export function getTaskStats(statuses: TaskStatus[]) {
  return statuses.reduce<Record<TaskStatKey, number>>(
    (stats, status) => {
      stats.total += 1;
      if (status === 'todo') stats.todo += 1;
      if (status === 'in_progress') stats.inProgress += 1;
      if (status === 'done') stats.done += 1;
      return stats;
    },
    { total: 0, todo: 0, inProgress: 0, done: 0 }
  );
}

type DashboardMembershipRow = {
  teams: (Team & { tasks?: Array<{ status: TaskStatus }> }) | null;
};

export async function loadDashboardPageData(supabase: {
  auth: {
    getSession: () => Promise<{ data: { session: { user: DashboardUserLike } | null } }>;
  };
  from: (table: string) => {
    select: (value: string) => {
      eq: (column: string, lookup: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<{
          data: DashboardMembershipRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}): Promise<DashboardPageData | DashboardRedirectResult> {
  // Middleware oturumu zaten doğruladı; burada lokal okuma yeterli (network turu yok).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return { redirectTo: '/login' as const };
  }

  // Ekipler + görev durumları tek network turunda (iç içe embed);
  // eski akış 2 ardışık sorgu + 1 auth turuydu.
  const { data: memberships, error: teamsError } = await supabase
    .from('team_members')
    .select('joined_at, teams(*, tasks(status))')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });

  if (teamsError) {
    throw new Error(teamsError.message);
  }

  const teamsWithTasks = (memberships ?? [])
    .map((membership) => membership.teams)
    .filter((team): team is NonNullable<DashboardMembershipRow['teams']> => Boolean(team));

  const teams: Team[] = teamsWithTasks.map((teamWithTasks) => {
    const team = { ...teamWithTasks };
    delete team.tasks;
    return team as Team;
  });
  const firstTeam = teamsWithTasks[0];
  const taskStatuses: TaskStatus[] = (firstTeam?.tasks ?? []).map((task) => task.status);

  return {
    firstName: getFirstName(user),
    teams,
    firstTeamId: firstTeam?.id ?? '',
    taskStats: getTaskStats(taskStatuses),
  };
}
