'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { QUERY_KEYS } from '@/lib/constants';
import type { Task } from '@/lib/types';

// Module-level map: taskId → timestamp of last local mutation
// Realtime events that arrive within 3s of a local mutation are skipped
const localMutations = new Map<string, number>();
const DEDUP_WINDOW_MS = 3000;

export function markLocalMutation(taskId: string) {
  localMutations.set(taskId, Date.now());
  setTimeout(() => localMutations.delete(taskId), DEDUP_WINDOW_MS);
}

function isOwnMutation(taskId: string): boolean {
  const ts = localMutations.get(taskId);
  return !!ts && Date.now() - ts < DEDUP_WINDOW_MS;
}

export function useRealtimeTasks(teamId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`tasks:team:${teamId}`)
      // INSERT — new task from another user: refetch to get full data (assignees, profiles)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const inserted = payload.new as Task;
          if (isOwnMutation(inserted.id)) return;
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
        }
      )
      // UPDATE — patch the task directly in cache, no spinner
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const updated = payload.new as Task;
          if (isOwnMutation(updated.id)) return;

          // Patch the tasks list
          queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
            old?.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)) ?? []
          );

          // Patch the individual task cache
          queryClient.setQueryData<Task>([QUERY_KEYS.task, updated.id], (old) =>
            old ? { ...old, ...updated } : old
          );
        }
      )
      // DELETE — remove from cache immediately
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const deleted = payload.old as { id: string };
          if (isOwnMutation(deleted.id)) return;

          queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
            old?.filter((t) => t.id !== deleted.id) ?? []
          );
          queryClient.removeQueries({ queryKey: [QUERY_KEYS.task, deleted.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);
}
