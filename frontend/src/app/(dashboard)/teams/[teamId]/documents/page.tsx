import { HydrationBoundary } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { createServerQueryClient, dehydrate } from '@/lib/server/prefetch';
import { fetchDocuments } from '@/lib/queries/team-data';
import { QUERY_KEYS } from '@/lib/constants';
import { DocumentsPageClient } from '@/components/documents/DocumentsPageClient';

export default async function DocumentsPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const supabase = createClient();
  const queryClient = createServerQueryClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id ?? null;

  const [, membershipResult] = await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.documents, teamId],
      queryFn: () => fetchDocuments(supabase as never, teamId),
    }),
    currentUserId
      ? supabase
          .from('team_members')
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', currentUserId)
          .maybeSingle()
      : Promise.resolve(null),
  ]);

  const isAdmin = membershipResult?.data?.role === 'admin';

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DocumentsPageClient teamId={teamId} currentUserId={currentUserId} isAdmin={isAdmin} />
    </HydrationBoundary>
  );
}
