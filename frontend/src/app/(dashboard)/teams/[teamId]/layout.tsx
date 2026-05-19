import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadTeamLayoutData } from '@/lib/team-layout';
import { TeamTabs } from '@/components/teams/TeamTabs';

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { teamId: string };
}) {
  const supabase = createClient();
  const result = await loadTeamLayoutData(supabase as never, params.teamId);

  if (result.notFound) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold" data-testid="team-header">
          {result.team.name}
        </h1>
      </div>

      <TeamTabs teamId={params.teamId} />

      <div>{children}</div>
    </div>
  );
}
