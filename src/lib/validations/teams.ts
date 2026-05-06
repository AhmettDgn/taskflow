import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Takım adı en az 2 karakter olmalıdır')
    .max(50, 'Takım adı en fazla 50 karakter olabilir'),
});

export const joinTeamSchema = z.object({
  inviteCode: z
    .string()
    .min(4, 'Davet kodu en az 4 karakter olmalıdır')
    .max(20, 'Geçersiz davet kodu'),
});

export type CreateTeamFormValues = z.infer<typeof createTeamSchema>;
export type JoinTeamFormValues = z.infer<typeof joinTeamSchema>;
