'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { QUERY_KEYS } from '@/lib/constants';
import { useUpdateTaskStatus } from '@/hooks/useTasks';
import type { Subtask, Task, TaskStatusColumn } from '@/lib/types';

// Hem [tasks, teamId] listesindeki hem [task, taskId] önbelleğindeki görevin
// subtasks dizisini aynı dönüşümle günceller.
function patchTaskSubtasks(
  queryClient: QueryClient,
  teamId: string,
  taskId: string,
  transform: (subtasks: Subtask[]) => Subtask[]
) {
  queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
    old?.map((task) =>
      task.id === taskId ? { ...task, subtasks: transform(task.subtasks ?? []) } : task
    ) ?? []
  );
  queryClient.setQueryData<Task>([QUERY_KEYS.task, taskId], (old) =>
    old ? { ...old, subtasks: transform(old.subtasks ?? []) } : old
  );
}

function getCachedTask(queryClient: QueryClient, teamId: string, taskId: string) {
  return (
    queryClient.getQueryData<Task>([QUERY_KEYS.task, taskId]) ??
    queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId])?.find((task) => task.id === taskId)
  );
}

// Otomatik tamamlama hedefi: ekip kolonlarında 'done' varsa onu, yoksa son kolonu kullan.
export function getAutoCompleteStatus(statuses: TaskStatusColumn[] | undefined) {
  if (!statuses || statuses.length === 0) return 'done';
  if (statuses.some((status) => status.value === 'done')) return 'done';
  return statuses[statuses.length - 1].value;
}

export function useAddSubtask(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const task = getCachedTask(queryClient, teamId, taskId);
      const nextPosition =
        (task?.subtasks ?? []).reduce((max, subtask) => Math.max(max, subtask.position), -1) + 1;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('subtasks')
        .insert({ task_id: taskId, title: title.trim(), position: nextPosition })
        .select('*')
        .single();

      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: (subtask) => {
      patchTaskSubtasks(queryClient, teamId, subtask.task_id, (subtasks) =>
        [...subtasks.filter((existing) => existing.id !== subtask.id), subtask].sort(
          (a, b) => a.position - b.position
        )
      );
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Alt görev eklenemedi');
    },
  });
}

export function useToggleSubtask(teamId: string) {
  const queryClient = useQueryClient();
  const { mutate: updateStatus } = useUpdateTaskStatus(teamId);

  return useMutation({
    mutationFn: async (subtask: Subtask) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subtasks')
        .update({ is_done: !subtask.is_done })
        .eq('id', subtask.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as Subtask;
    },
    onMutate: async (subtask) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.task, subtask.task_id] });

      const previousList = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      const previousTask = queryClient.getQueryData<Task>([QUERY_KEYS.task, subtask.task_id]);

      patchTaskSubtasks(queryClient, teamId, subtask.task_id, (subtasks) =>
        subtasks.map((existing) =>
          existing.id === subtask.id ? { ...existing, is_done: !subtask.is_done } : existing
        )
      );

      return { previousList, previousTask, taskId: subtask.task_id };
    },
    onError: (_error, _subtask, context) => {
      if (context?.previousList) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previousList);
      }
      if (context?.previousTask) {
        queryClient.setQueryData([QUERY_KEYS.task, context.taskId], context.previousTask);
      }
      toast.error('Alt görev güncellenemedi');
    },
    onSuccess: (updated) => {
      // Otomatik tamamlama: tüm alt görevler bittiyse üst görevi done kolonuna taşı.
      const task = getCachedTask(queryClient, teamId, updated.task_id);
      const subtasks = task?.subtasks ?? [];
      const doneStatus = getAutoCompleteStatus(
        queryClient.getQueryData<TaskStatusColumn[]>([QUERY_KEYS.taskStatuses, teamId])
      );

      if (
        task &&
        updated.is_done &&
        subtasks.length > 0 &&
        subtasks.every((subtask) => subtask.is_done) &&
        task.status !== doneStatus
      ) {
        updateStatus({ taskId: task.id, status: doneStatus });
        toast.success('Tüm alt görevler bitti — görev tamamlandı 🎉');
      }
    },
  });
}

export function useDeleteSubtask(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subtask: Subtask) => {
      const supabase = createClient();
      const { error } = await supabase.from('subtasks').delete().eq('id', subtask.id);
      if (error) throw error;
      return subtask;
    },
    onSuccess: (subtask) => {
      patchTaskSubtasks(queryClient, teamId, subtask.task_id, (subtasks) =>
        subtasks.filter((existing) => existing.id !== subtask.id)
      );
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Alt görev silinemedi');
    },
  });
}
