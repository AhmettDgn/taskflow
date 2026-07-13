import { HydrationBoundary } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { createServerQueryClient, dehydrate } from '@/lib/server/prefetch';
import { fetchTeams } from '@/lib/queries/team-data';
import { QUERY_KEYS } from '@/lib/constants';
import { normalizeTaskStatusColumns } from '@/lib/task-statuses';
import { TasksPageClient } from '@/components/tasks/TasksPageClient';
import type { Task, TaskStatusColumn } from '@/lib/types';

// Eski N+1 akışının (ekip başına 2 client isteği) yerine sunucuda 3 sorgu:
// ekipler + tüm ekiplerin görevleri (tek in()) + tüm kolonlar (tek in()).
// Sonuçlar ekip bazında bölünüp mevcut query key'lere seed edilir.
export default async function TasksPage() {
  const supabase = createClient();
  const queryClient = createServerQueryClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const teams = await fetchTeams(supabase as never, user.id);
    queryClient.setQueryData([QUERY_KEYS.teams], teams);

    const teamIds = teams.map((team) => team.id);

    if (teamIds.length > 0) {
      const [tasksResult, statusesResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, task_assignees(*, profiles(*))')
          .in('team_id', teamIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('task_statuses')
          .select('*')
          .in('team_id', teamIds)
          .order('position', { ascending: true }),
      ]);

      if (!tasksResult.error) {
        const allTasks = (tasksResult.data ?? []) as Task[];
        for (const teamId of teamIds) {
          queryClient.setQueryData(
            [QUERY_KEYS.tasks, teamId],
            allTasks.filter((task) => task.team_id === teamId)
          );
        }
      }

      if (!statusesResult.error) {
        const allStatuses = (statusesResult.data ?? []) as TaskStatusColumn[];
        for (const teamId of teamIds) {
          queryClient.setQueryData(
            [QUERY_KEYS.taskStatuses, teamId],
            normalizeTaskStatusColumns(allStatuses.filter((status) => status.team_id === teamId))
          );
        }
      }
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksPageClient />
    </HydrationBoundary>
  );
}
