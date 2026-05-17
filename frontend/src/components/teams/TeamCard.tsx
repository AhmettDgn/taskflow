'use client';

import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import type { Team } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteButton } from './InviteButton';

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            {team.name}
          </CardTitle>
          <Link
            href={`/teams/${team.id}/board`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            Aç <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Davet kodu:{' '}
          <span className="font-mono font-medium text-foreground">{team.invite_code}</span>
        </p>
        <InviteButton inviteCode={team.invite_code} />
      </CardContent>
    </Card>
  );
}
