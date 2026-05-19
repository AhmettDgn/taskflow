'use client';

import { JoinTeamForm } from '@/components/teams/JoinTeamForm';

export default function JoinTeamPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="team-join-heading">Ekibe Katıl</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Davet kodunuzu girerek bir ekibe katılın.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-white p-6">
        <JoinTeamForm />
      </div>
    </div>
  );
}
