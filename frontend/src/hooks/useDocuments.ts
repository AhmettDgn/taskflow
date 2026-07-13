'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiPath } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import { fetchDocuments } from '@/lib/queries/team-data';
import {
  DOCUMENTS_BUCKET,
  MAX_DOCUMENT_SIZE_BYTES,
  isAllowedDocumentName,
  sanitizeFileName,
} from '@/lib/documents';
import type { TeamDocument } from '@/lib/types';

async function request<T>(path: string, method: string, body?: unknown, fallbackError?: string) {
  const response = await fetch(getApiPath(path), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? fallbackError ?? 'İşlem başarısız');
  }
  return json as T;
}

export function useDocuments(teamId: string) {
  return useQuery<TeamDocument[]>({
    queryKey: [QUERY_KEYS.documents, teamId],
    queryFn: () => fetchDocuments(createClient(), teamId),
    staleTime: STALE_TIME,
    enabled: !!teamId,
  });
}

export function useUploadDocument(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        throw new Error('Dosya 20MB sınırını aşıyor');
      }
      if (!isAllowedDocumentName(file.name)) {
        throw new Error('Bu dosya türü desteklenmiyor');
      }

      const supabase = createClient();
      const path = `${teamId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

      // Vercel body limitine takılmamak için dosya doğrudan Storage'a gider (RLS korumalı);
      // metadata kaydı API route üzerinden yapılır.
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, file, {
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        throw new Error('Dosya yüklenemedi');
      }

      try {
        return await request<{ document: TeamDocument }>(
          `/teams/${teamId}/documents`,
          'POST',
          {
            name: file.name,
            file_path: path,
            mime_type: file.type || null,
            size_bytes: file.size,
          },
          'Döküman kaydedilemedi'
        );
      } catch (error) {
        // Metadata kaydı başarısızsa yüklenen dosyayı best-effort temizle.
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]).catch(() => undefined);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents, teamId] });
      toast.success('Döküman yüklendi');
    },
    onError: (error: Error) => toast.error(error.message ?? 'Döküman yüklenemedi'),
  });
}

export function useDeleteDocument(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      request<{ success: boolean }>(
        `/teams/${teamId}/documents/${documentId}`,
        'DELETE',
        undefined,
        'Döküman silinemedi'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents, teamId] });
      toast.success('Döküman silindi');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Private bucket — indirme kısa ömürlü imzalı URL ile yapılır;
// select RLS politikası zaten ekip üyeliğini şart koşar.
export async function openDocument(document: TeamDocument) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.file_path, 60);

  if (error || !data?.signedUrl) {
    toast.error('Dosya bağlantısı oluşturulamadı');
    return;
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
