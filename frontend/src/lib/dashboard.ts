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

export async function loadDashboardPageData(supabase: {
  auth: { getUser: () => Promise<{ data: { user: DashboardUserLike | null } }> };
  from: (table: string) => {
    select: (value: string) => {
      eq: (column: string, lookup: string) => unknown;
    };
  };
}): Promise<DashboardPageData | DashboardRedirectResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirectTo: '/login' as const };
  }

  const membershipsQuery = supabase
    .from('team_members')
    .select('joined_at, teams(*)')
    .eq('user_id', user.id) as {
    order: (column: string, options: { ascending: boolean }) => Promise<{
      data: Array<{ teams: Team | null }> | null;
      error: { message: string } | null;
    }>;
  };

  const { data: memberships, error: teamsError } = await membershipsQuery.order('joined_at', {
    ascending: true,
  });

  if (teamsError) {
    throw new Error(teamsError.message);
  }

  const teams = (memberships ?? [])
    .map((membership) => membership.teams)
    .filter((team): team is Team => Boolean(team));

  const firstTeamId = teams[0]?.id ?? '';
  let taskStatuses: TaskStatus[] = [];

  if (firstTeamId) {
    const tasksQuery = supabase
      .from('tasks')
      .select('status')
      .eq('team_id', firstTeamId) as Promise<{
      data: Array<{ status: TaskStatus }> | null;
      error: { message: string } | null;
    }>;

    const { data: tasks, error: tasksError } = await tasksQuery;

    if (tasksError) {
      throw new Error(tasksError.message);
    }

    taskStatuses = (tasks ?? []).map((task) => task.status);
  }

  return {
    firstName: getFirstName(user),
    teams,
    firstTeamId,
    taskStats: getTaskStats(taskStatuses),
  };
}
