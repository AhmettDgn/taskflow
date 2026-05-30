'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLeaveTeam } from '@/hooks/useTeam';

interface LeaveTeamButtonProps {
  teamId: string;
  teamName?: string;
}

export function LeaveTeamButton({ teamId, teamName }: LeaveTeamButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { mutateAsync: leaveTeam, isPending } = useLeaveTeam();

  const handleLeave = async () => {
    try {
      await leaveTeam(teamId);
      setOpen(false);
      router.push('/teams');
      router.refresh();
    } catch {
      // Error toast is surfaced by the mutation; keep the dialog open.
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-4 w-4" />
        Ekipten Ayrıl
      </Button>

      <Dialog open={open} onOpenChange={(value) => !isPending && setOpen(value)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ekipten ayrılmak istediğinize emin misiniz?</DialogTitle>
            <DialogDescription>
              {teamName ? `"${teamName}" ekibinden` : 'Bu ekipten'} ayrılacaksınız. Tekrar
              katılmak için bir davet koduna ihtiyaç duyarsınız.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Ayrıl
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
