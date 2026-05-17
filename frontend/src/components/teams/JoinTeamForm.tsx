'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJoinTeam } from '@/hooks/useTeam';
import { joinTeamSchema, type JoinTeamFormValues } from '@/lib/validations/teams';

export function JoinTeamForm() {
  const router = useRouter();
  const { mutateAsync: joinTeam, isPending } = useJoinTeam();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinTeamFormValues>({
    resolver: zodResolver(joinTeamSchema),
  });

  const onSubmit = async (values: JoinTeamFormValues) => {
    const team = await joinTeam(values.inviteCode);
    router.push(`/teams/${team.id}/board`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Davet Kodu</Label>
        <Input
          id="inviteCode"
          placeholder="Davet kodunu buraya girin"
          disabled={isPending}
          autoComplete="off"
          {...register('inviteCode')}
        />
        {errors.inviteCode && (
          <p className="text-xs text-destructive">{errors.inviteCode.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
          disabled={isPending}
        >
          İptal
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ekibe Katıl
        </Button>
      </div>
    </form>
  );
}
