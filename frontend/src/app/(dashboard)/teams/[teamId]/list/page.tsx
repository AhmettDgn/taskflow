import { HydrationBoundary } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { createServerQueryClient, dehydrate } from '@/lib/server/prefetch';
import { fetchTeamPageBundle } from '@/lib/queries/team-data';
import { QUERY_KEYS } from '@/lib/constants';
import { ListPageClient } from '@/components/tasks/ListPageClient';

export default async function ListPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const supabase = createClient();
  const queryClient = createServerQueryClient();

  try {
    // Tek network turu: ekip + görevler + kolonlar + üyeler
    const bundle = await fetchTeamPageBundle(supabase as never, teamId);
    queryClient.setQueryData([QUERY_KEYS.team, teamId], bundle.team);
    queryClient.setQueryData([QUERY_KEYS.tasks, teamId], bundle.tasks);
    queryClient.setQueryData([QUERY_KEYS.taskStatuses, teamId], bundle.taskStatuses);
    queryClient.setQueryData([QUERY_KEYS.members, teamId], bundle.members);
  } catch {
    // Prefetch başarısızsa client hook'lar kendisi çeker; sayfa yine açılır.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListPageClient teamId={teamId} />
    </HydrationBoundary>
  );
}
