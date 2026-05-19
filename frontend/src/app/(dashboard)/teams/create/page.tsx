'use client';

import { CreateTeamForm } from '@/components/teams/CreateTeamForm';

export default function CreateTeamPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="team-create-heading">Ekip Oluştur</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Yeni bir ekip oluşturun ve üyeleri davet edin.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-white p-6">
        <CreateTeamForm />
      </div>
    </div>
  );
}
