'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiPath } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import { fetchBoards } from '@/lib/queries/team-data';
import type { Board, BoardItem } from '@/lib/types';
import type {
  BoardItemValues,
  UpdateBoardItemValues,
} from '@/lib/validations/boards';

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

export function useBoards(teamId: string) {
  return useQuery<Board[]>({
    queryKey: [QUERY_KEYS.boards, teamId],
    queryFn: () => fetchBoards(createClient(), teamId),
    staleTime: STALE_TIME,
    enabled: !!teamId,
  });
}

export function useCreateBoard(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      request<{ board: Board }>(`/teams/${teamId}/boards`, 'POST', { name }, 'Pano oluşturulamadı'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.boards, teamId] });
      toast.success('Pano oluşturuldu');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRenameBoard(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) =>
      request<{ board: Board }>(`/teams/${teamId}/boards/${boardId}`, 'PATCH', { name }, 'Pano güncellenemedi'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.boards, teamId] });
      toast.success('Pano güncellendi');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBoard(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) =>
      request<{ success: boolean }>(`/teams/${teamId}/boards/${boardId}`, 'DELETE', undefined, 'Pano silinemedi'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.boards, teamId] });
      toast.success('Pano silindi');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useCreateBoardItem(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, values }: { boardId: string; values: BoardItemValues }) =>
      request<{ item: BoardItem }>(
        `/teams/${teamId}/boards/${boardId}/items`,
        'POST',
        values,
        'İçerik eklenemedi'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.boards, teamId] });
      toast.success('İçerik eklendi');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBoardItem(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      itemId,
      values,
    }: {
      boardId: string;
      itemId: string;
      values: UpdateBoardItemValues;
    }) =>
      request<{ item: BoardItem }>(
        `/teams/${teamId}/boards/${boardId}/items/${itemId}`,
        'PATCH',
        values,
        'İçerik güncellenemedi'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.boards, teamId] });
      toast.success('İçerik güncellendi');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBoardItem(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId, itemId }: { boardId: string; itemId: string }) =>
      request<{ success: boolean }>(
        `/teams/${teamId}/boards/${boardId}/items/${itemId}`,
        'DELETE',
        undefined,
        'İçerik silinemedi'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.boards, teamId] });
      toast.success('İçerik silindi');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
