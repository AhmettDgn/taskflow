import { z } from 'zod';
import { MAX_DOCUMENT_SIZE_BYTES } from '@/lib/documents';

export const createDocumentSchema = z.object({
  name: z
    .string()
    .min(1, 'Dosya adı boş olamaz')
    .max(255, 'Dosya adı en fazla 255 karakter olabilir'),
  file_path: z
    .string()
    .min(1, 'Dosya yolu gerekli')
    .max(1024, 'Dosya yolu çok uzun'),
  mime_type: z.string().max(255).nullable().optional(),
  size_bytes: z
    .number()
    .int()
    .min(0)
    .max(MAX_DOCUMENT_SIZE_BYTES, 'Dosya 20MB sınırını aşıyor'),
});

export type CreateDocumentValues = z.infer<typeof createDocumentSchema>;
