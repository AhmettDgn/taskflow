'use client';

import Link from 'next/link';
import { Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamCard } from '@/components/teams/TeamCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeams } from '@/hooks/useTeam';

export default function TeamsPage() {
  const { data: teams, isLoading } = useTeams();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="teams-heading">Ekipler</h1>
          <p className="text-sm text-muted-foreground">Üye olduğunuz ekipler</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/teams/join">
              <UserPlus className="mr-2 h-4 w-4" />
              Ekibe Katıl
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/teams/create">
              <Plus className="mr-2 h-4 w-4" />
              Ekip Oluştur
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && teams?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Henüz ekip yok</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Yeni bir ekip oluşturun veya davet koduyla katılın.
          </p>
          <div className="mt-4 flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
            <Button variant="outline" asChild size="sm" className="w-full sm:w-auto">
              <Link href="/teams/join">Ekibe Katıl</Link>
            </Button>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/teams/create">Ekip Oluştur</Link>
            </Button>
          </div>
        </div>
      )}

      {!isLoading && teams && teams.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
