'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTeam } from '@/hooks/useTeam';
import { createTeamSchema, type CreateTeamFormValues } from '@/lib/validations/teams';

export function CreateTeamForm() {
  const router = useRouter();
  const { mutateAsync: createTeam, isPending } = useCreateTeam();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
  });

  const onSubmit = async (values: CreateTeamFormValues) => {
    const team = await createTeam(values.name);
    router.push(`/teams/${team.id}/board`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Takım Adı</Label>
        <Input
          id="name"
          placeholder="Örn: Ürün Ekibi"
          disabled={isPending}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
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
          Ekip Oluştur
        </Button>
      </div>
    </form>
  );
}
