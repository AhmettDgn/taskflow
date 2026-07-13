'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiPath } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import { markLocalMutation } from '@/hooks/useRealtimeTasks';
import { fetchTask, fetchTasks } from '@/lib/queries/team-data';
import type { AssignmentNotificationWarning, Task, TaskAssignee, TaskPriority, TaskStatus } from '@/lib/types';
import type { CreateTaskFormValues, UpdateTaskFormValues } from '@/lib/validations/tasks';

interface TaskMutationResponse {
  task: Task;
  warnings: AssignmentNotificationWarning[];
}

export function getAssignmentWarningToastMessage(warnings: AssignmentNotificationWarning[]) {
  if (warnings.length === 0) return null;
  if (warnings.length === 1) return warnings[0].message;

  const missingTelegramCount = warnings.filter((warning) => warning.reason === 'telegram_not_linked').length;
  const sendFailedCount = warnings.filter((warning) => warning.reason === 'telegram_send_failed').length;
  const messages = [];

  if (missingTelegramCount > 0) {
    messages.push(`${missingTelegramCount} kullanicinin Telegram chat ID bilgisi eksik`);
  }

  if (sendFailedCount > 0) {
    messages.push(`${sendFailedCount} kullaniciya Telegram mesaji gonderilemedi`);
  }

  return `${messages.join('. ')}.`;
}

function showAssignmentWarnings(warnings: AssignmentNotificationWarning[]) {
  const message = getAssignmentWarningToastMessage(warnings);
  if (message) {
    toast.warning(message);
  }
}

async function updateTaskRequest(
  teamId: string,
  taskId: string,
  values: UpdateTaskFormValues
) {
  const response = await fetch(getApiPath(`/teams/${teamId}/tasks/${taskId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(values),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? 'Gorev guncellenemedi');
  }

  return json as { task: Task };
}

async function syncTaskAssigneesRequest(teamId: string, taskId: string, userIds: string[]) {
  const response = await fetch(getApiPath(`/teams/${teamId}/tasks/${taskId}/assignees`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userIds }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? 'Atama guncellenemedi');
  }

  return json as TaskMutationResponse;
}

async function getCurrentAssigneeIds({
  queryClient,
  teamId,
  taskId,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  teamId: string;
  taskId: string;
}) {
  const cachedTask =
    queryClient.getQueryData<Task>([QUERY_KEYS.task, taskId]) ??
    queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId])?.find((task) => task.id === taskId);

  if (cachedTask) {
    return (cachedTask.task_assignees ?? []).map((assignee) => assignee.user_id);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', taskId);

  if (error) throw error;
  return (data ?? []).map((assignee) => assignee.user_id);
}

export function useTasks(teamId: string) {
  return useQuery<Task[]>({
    queryKey: [QUERY_KEYS.tasks, teamId],
    queryFn: () => fetchTasks(createClient(), teamId),
    staleTime: STALE_TIME,
    enabled: !!teamId,
  });
}

export function useTask(taskId: string) {
  return useQuery<Task>({
    queryKey: [QUERY_KEYS.task, taskId],
    queryFn: () => fetchTask(createClient(), taskId),
    staleTime: STALE_TIME,
    enabled: !!taskId,
  });
}

export function useCreateTask(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateTaskFormValues) => {
      const response = await fetch(getApiPath(`/teams/${teamId}/tasks`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? 'Gorev olusturulamadi');
      }

      return json as TaskMutationResponse;
    },
    onSuccess: ({ task, warnings }) => {
      markLocalMutation(task.id);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      toast.success('Gorev olusturuldu');
      showAssignmentWarnings(warnings);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Gorev olusturulamadi');
    },
  });
}

export function useUpdateTask(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, values }: { taskId: string; values: UpdateTaskFormValues }) => {
      const { task } = await updateTaskRequest(teamId, taskId, values);
      return task;
    },
    onSuccess: (task) => {
      markLocalMutation(task.id);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.task, task.id] });
      toast.success('Gorev guncellendi');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Gorev guncellenemedi');
    },
  });
}

export function useUpdateTaskStatus(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      await updateTaskRequest(teamId, taskId, { status });
      return { taskId, status };
    },
    onMutate: async ({ taskId, status }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);

      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, status } : task)) ?? []
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Durum guncellenemedi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
    },
  });
}

export function useUpdateTaskPriority(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, priority }: { taskId: string; priority: TaskPriority }) => {
      await updateTaskRequest(teamId, taskId, { priority });
      return { taskId, priority };
    },
    onMutate: async ({ taskId, priority }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, priority } : task)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Oncelik guncellenemedi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
    },
  });
}

export function useUpdateTaskDueDate(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, dueDate }: { taskId: string; dueDate: string | null }) => {
      await updateTaskRequest(teamId, taskId, { due_date: dueDate ?? '' });
      return { taskId, dueDate };
    },
    onMutate: async ({ taskId, dueDate }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, due_date: dueDate } : task)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Tarih guncellenemedi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
    },
  });
}

export function useUpdateTaskTitle(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      await updateTaskRequest(teamId, taskId, { title });
      return { taskId, title };
    },
    onMutate: async ({ taskId, title }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, title } : task)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Baslik guncellenemedi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
    },
  });
}

export function useSetTaskAssignees(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userIds }: { taskId: string; userIds: string[] }) => {
      const result = await syncTaskAssigneesRequest(teamId, taskId, userIds);
      return { taskId, userIds, warnings: result.warnings };
    },
    onMutate: async ({ taskId, userIds }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      const members = queryClient.getQueryData<{ user_id: string; profiles?: unknown }[]>([
        QUERY_KEYS.members,
        teamId,
      ]);

      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((task) => {
          if (task.id !== taskId) return task;
          const optimisticAssignees: TaskAssignee[] = userIds.map((userId) => {
            const member = members?.find((teamMember) => teamMember.user_id === userId);
            return {
              id: `optimistic-${userId}`,
              task_id: taskId,
              user_id: userId,
              profiles: member?.profiles as TaskAssignee['profiles'],
            };
          });
          return { ...task, task_assignees: optimisticAssignees };
        }) ?? []
      );

      return { previous };
    },
    onSuccess: ({ warnings }) => {
      showAssignmentWarnings(warnings);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Atama guncellenemedi');
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.task, taskId] });
    },
  });
}

export function useDeleteTask(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      return taskId;
    },
    onMutate: async (taskId) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);

      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.filter((task) => task.id !== taskId) ?? []
      );
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.task, taskId] });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      toast.success('Gorev silindi');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Gorev silinemedi');
    },
  });
}

export function useAssignUser(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const currentAssigneeIds = await getCurrentAssigneeIds({ queryClient, teamId, taskId });
      const nextAssigneeIds = currentAssigneeIds.includes(userId)
        ? currentAssigneeIds
        : [...currentAssigneeIds, userId];

      return syncTaskAssigneesRequest(teamId, taskId, nextAssigneeIds);
    },
    onSuccess: ({ warnings }, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.task, taskId] });
      showAssignmentWarnings(warnings);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Kullanici atanamadi');
    },
  });
}

export function useUnassignUser(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const currentAssigneeIds = await getCurrentAssigneeIds({ queryClient, teamId, taskId });
      const nextAssigneeIds = currentAssigneeIds.filter((currentUserId) => currentUserId !== userId);
      return syncTaskAssigneesRequest(teamId, taskId, nextAssigneeIds);
    },
    onSuccess: ({ warnings }, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.task, taskId] });
      showAssignmentWarnings(warnings);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Atama kaldirilamadi');
    },
  });
}
