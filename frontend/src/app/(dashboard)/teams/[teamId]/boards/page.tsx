import { HydrationBoundary } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { createServerQueryClient, dehydrate } from '@/lib/server/prefetch';
import { fetchBoards, fetchTeamMembers } from '@/lib/queries/team-data';
import { QUERY_KEYS } from '@/lib/constants';
import { BoardsPageClient } from '@/components/boards/BoardsPageClient';

export default async function BoardsPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const supabase = createClient();
  const queryClient = createServerQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.boards, teamId],
      queryFn: () => fetchBoards(supabase as never, teamId),
    }),
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.members, teamId],
      queryFn: () => fetchTeamMembers(supabase as never, teamId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoardsPageClient teamId={teamId} />
    </HydrationBoundary>
  );
}
