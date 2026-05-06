'use client';

import { useState } from 'react';
import { Mail, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamMembers, useTeam, useInviteByEmail } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { MemberList } from '@/components/teams/MemberList';

function InviteCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Davet kodu kopyalandı');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Davet Kodu
      </p>
      <p className="mb-3 text-sm text-muted-foreground">
        Bu kodu paylaşın — ekibe katılmak isteyen kişi &ldquo;Ekibe Katıl&rdquo; ekranına girerek kullanabilir.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-border bg-muted/40 px-4 py-2.5 font-mono text-sm font-semibold tracking-widest text-foreground select-all">
          {code}
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="flex-shrink-0 gap-2">
          {copied ? (
            <><Check className="h-4 w-4 text-green-600" /> Kopyalandı</>
          ) : (
            <><Copy className="h-4 w-4" /> Kopyala</>
          )}
        </Button>
      </div>
    </div>
  );
}

function InviteByEmailForm({ teamId }: { teamId: string }) {
  const [email, setEmail] = useState('');
  const { mutateAsync: invite, isPending } = useInviteByEmail(teamId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await invite(email.trim());
    setEmail('');
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        E-posta ile Davet
      </p>
      <p className="mb-3 text-sm text-muted-foreground">
        TaskFlow&apos;a kayıtlı bir kullanıcıyı e-posta adresiyle doğrudan ekleyin.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="kullanici@ornek.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isPending || !email.trim()} className="flex-shrink-0">
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Davet Et
        </Button>
      </form>
    </div>
  );
}

export default function MembersPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const { user } = useAuth();
  const { data: team } = useTeam(teamId);
  const { data: members, isLoading } = useTeamMembers(teamId);

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Üyeler</h2>
        <p className="text-sm text-muted-foreground">{members?.length ?? 0} üye</p>
      </div>

      {/* Admin-only: invite tools */}
      {isAdmin && team && (
        <div className="grid gap-4 md:grid-cols-2">
          <InviteCodeBox code={team.invite_code} />
          <InviteByEmailForm teamId={teamId} />
        </div>
      )}

      {/* Member list */}
      <div className="rounded-xl border border-border bg-white p-4">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && members && (
          <MemberList
            members={members}
            teamId={teamId}
            currentUserId={user?.id}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}
