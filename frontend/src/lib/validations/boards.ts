import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z
    .string()
    .min(1, 'Pano adı boş olamaz')
    .max(100, 'Pano adı en fazla 100 karakter olabilir'),
});

export const updateBoardSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Pano adı boş olamaz')
      .max(100, 'Pano adı en fazla 100 karakter olabilir')
      .optional(),
    position: z.number().int().optional(),
  })
  .refine((data) => data.name !== undefined || data.position !== undefined, {
    message: 'Güncellenecek bir alan gerekli',
  });

export const boardItemSchema = z.object({
  type: z.enum(['link', 'password', 'note']),
  label: z.string().max(200, 'Etiket en fazla 200 karakter olabilir').optional(),
  value: z
    .string()
    .min(1, 'Değer boş olamaz')
    .max(5000, 'Değer en fazla 5000 karakter olabilir'),
});

export const updateBoardItemSchema = boardItemSchema.partial().refine(
  (data) => data.type !== undefined || data.label !== undefined || data.value !== undefined,
  { message: 'Güncellenecek bir alan gerekli' }
);

export type CreateBoardValues = z.infer<typeof createBoardSchema>;
export type UpdateBoardValues = z.infer<typeof updateBoardSchema>;
export type BoardItemValues = z.infer<typeof boardItemSchema>;
export type UpdateBoardItemValues = z.infer<typeof updateBoardItemSchema>;
