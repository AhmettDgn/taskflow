import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Başlık boş olamaz')
    .max(200, 'Başlık en fazla 200 karakter olabilir'),
  description: z.string().max(2000, 'Açıklama en fazla 2000 karakter olabilir').optional(),
  status: z
    .string()
    .min(1, 'Durum gerekli')
    .max(64, 'Durum en fazla 64 karakter olabilir')
    .regex(/^[a-z0-9_]+$/, 'Durum değeri geçersiz'),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const setTaskAssigneesSchema = z.object({
  userIds: z.array(z.string()),
});

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;
export type UpdateTaskFormValues = z.infer<typeof updateTaskSchema>;
export type SetTaskAssigneesValues = z.infer<typeof setTaskAssigneesSchema>;
