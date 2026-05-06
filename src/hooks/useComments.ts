'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getAuthContext } from '@/lib/supabase/auth-helpers';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import type { Comment } from '@/lib/types';

export function useComments(taskId: string) {
  return useQuery<Comment[]>({
    queryKey: [QUERY_KEYS.comments, taskId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Comment[];
    },
    staleTime: STALE_TIME,
    enabled: !!taskId,
  });
}

export function useAddComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const { supabase, userId } = await getAuthContext();

      const { data, error } = await supabase
        .from('comments')
        .insert({ task_id: taskId, user_id: userId, content: content.trim() })
        .select('*, profiles(*)')
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: (comment) => {
      // Append directly to cache — no refetch needed
      queryClient.setQueryData<Comment[]>([QUERY_KEYS.comments, taskId], (old) =>
        old ? [...old, comment] : [comment]
      );
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Yorum eklenemedi');
    },
  });
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      return commentId;
    },
    onSuccess: (commentId) => {
      queryClient.setQueryData<Comment[]>([QUERY_KEYS.comments, taskId], (old) =>
        old?.filter((c) => c.id !== commentId) ?? []
      );
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Yorum silinemedi');
    },
  });
}

export function useRealtimeComments(taskId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!taskId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`comments:task:${taskId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        () => {
          // INSERT: need profiles join, so invalidate to refetch with full data
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.comments, taskId] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        (payload) => {
          const deleted = payload.old as { id: string };
          queryClient.setQueryData<Comment[]>([QUERY_KEYS.comments, taskId], (old) =>
            old?.filter((c) => c.id !== deleted.id) ?? []
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);
}
