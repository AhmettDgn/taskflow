'use client';

import { Trash2 } from 'lucide-react';
import type { TeamMember } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRemoveTeamMember } from '@/hooks/useTeam';
import { getInitials } from '@/lib/utils';

interface MemberListProps {
  members: TeamMember[];
  teamId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  member: 'Üye',
};

export function MemberList({ members, teamId, currentUserId, isAdmin }: MemberListProps) {
  const { mutate: removeMember, isPending } = useRemoveTeamMember();

  return (
    <ul className="divide-y divide-border">
      {members.map((member) => {
        const isSelf = member.user_id === currentUserId;
        const canRemove = isAdmin && !isSelf;

        return (
          <li
            key={member.id}
            className="flex items-center gap-3 py-3 px-2 hover:bg-gray-50 rounded-md"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(member.profiles?.full_name ?? null)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {member.profiles?.full_name ?? 'Kullanıcı'}
                {isSelf && (
                  <span className="ml-1 text-xs text-muted-foreground">(siz)</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {member.profiles?.email ?? ''}
              </p>
            </div>

            <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
              {roleLabels[member.role] ?? member.role}
            </Badge>

            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => removeMember({ memberId: member.id, teamId })}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Üyeyi çıkar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
