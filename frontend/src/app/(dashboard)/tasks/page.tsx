import { HydrationBoundary } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { createServerQueryClient, dehydrate } from '@/lib/server/prefetch';
import { fetchTeamsTaskData } from '@/lib/queries/team-data';
import { QUERY_KEYS } from '@/lib/constants';
import { TasksPageClient } from '@/components/tasks/TasksPageClient';

// Tüm ekipler + görevleri + kolonları tek network turunda gelir (iç içe embed);
// eski akış ekip başına 2 client isteği, sonrasında da 2 ardışık sunucu sorgusuydu.
export default async function TasksPage() {
  const supabase = createClient();
  const queryClient = createServerQueryClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (userId) {
    try {
      const { teams, tasksByTeam, statusesByTeam } = await fetchTeamsTaskData(
        supabase as never,
        userId
      );

      queryClient.setQueryData([QUERY_KEYS.teams], teams);
      for (const team of teams) {
        const teamTasks = tasksByTeam.get(team.id);
        const teamStatuses = statusesByTeam.get(team.id);
        if (teamTasks) queryClient.setQueryData([QUERY_KEYS.tasks, team.id], teamTasks);
        if (teamStatuses) queryClient.setQueryData([QUERY_KEYS.taskStatuses, team.id], teamStatuses);
      }
    } catch {
      // Prefetch başarısızsa client hook'lar kendisi çeker; sayfa yine açılır.
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksPageClient />
    </HydrationBoundary>
  );
}
