import { notFound } from 'next/navigation';
import { HydrationBoundary } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { createServerQueryClient, dehydrate } from '@/lib/server/prefetch';
import { fetchTask, fetchTaskStatuses, fetchTeamMembers } from '@/lib/queries/team-data';
import { QUERY_KEYS } from '@/lib/constants';
import { TaskDetailPageClient } from '@/components/tasks/TaskDetailPageClient';

export default async function TaskDetailPage({
  params,
}: {
  params: { teamId: string; taskId: string };
}) {
  const { teamId, taskId } = params;
  const supabase = createClient();
  const queryClient = createServerQueryClient();

  // Üç sorgu tek network turunda (paralel); görev yoksa/erişim yoksa 404.
  const [taskResult] = await Promise.all([
    queryClient
      .fetchQuery({
        queryKey: [QUERY_KEYS.task, taskId],
        queryFn: () => fetchTask(supabase as never, taskId),
      })
      .then(
        () => ({ ok: true as const }),
        () => ({ ok: false as const })
      ),
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.members, teamId],
      queryFn: () => fetchTeamMembers(supabase as never, teamId),
    }),
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.taskStatuses, teamId],
      queryFn: () => fetchTaskStatuses(supabase as never, teamId),
    }),
  ]);

  if (!taskResult.ok) {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TaskDetailPageClient teamId={teamId} taskId={taskId} />
    </HydrationBoundary>
  );
}
