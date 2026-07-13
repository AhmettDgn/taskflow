import { HydrationBoundary } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { createServerQueryClient, dehydrate } from '@/lib/server/prefetch';
import { fetchTasks, fetchTaskStatuses, fetchTeamMembers } from '@/lib/queries/team-data';
import { QUERY_KEYS } from '@/lib/constants';
import { ListPageClient } from '@/components/tasks/ListPageClient';

export default async function ListPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const supabase = createClient();
  const queryClient = createServerQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.tasks, teamId],
      queryFn: () => fetchTasks(supabase as never, teamId),
    }),
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.taskStatuses, teamId],
      queryFn: () => fetchTaskStatuses(supabase as never, teamId),
    }),
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.members, teamId],
      queryFn: () => fetchTeamMembers(supabase as never, teamId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListPageClient teamId={teamId} />
    </HydrationBoundary>
  );
}
