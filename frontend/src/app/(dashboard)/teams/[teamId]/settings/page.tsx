'use client';

import { useTeam } from '@/hooks/useTeam';
import { LeaveTeamButton } from '@/components/teams/LeaveTeamButton';

export default function TeamSettingsPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const { data: team } = useTeam(teamId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="team-settings-heading">
          Ekip Ayarları
        </h1>
        <p className="text-sm text-muted-foreground">{team?.name ?? 'Ekip'}</p>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <h2 className="text-sm font-semibold text-destructive">Tehlikeli Bölge</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Ekipten ayrıldığınızda bu ekibin görevlerine ve üyelerine artık erişemezsiniz.
        </p>
        <LeaveTeamButton teamId={teamId} teamName={team?.name} />
      </div>
    </div>
  );
}
