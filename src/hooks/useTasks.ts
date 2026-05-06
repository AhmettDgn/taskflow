'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getAuthContext } from '@/lib/supabase/auth-helpers';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import { markLocalMutation } from '@/hooks/useRealtimeTasks';
import type { Task, TaskAssignee, TaskPriority, TaskStatus } from '@/lib/types';
import type { CreateTaskFormValues, UpdateTaskFormValues } from '@/lib/validations/tasks';

export function useTasks(teamId: string) {
  return useQuery<Task[]>({
    queryKey: [QUERY_KEYS.tasks, teamId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select('*, task_assignees(*, profiles(*))')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Task[];
    },
    staleTime: STALE_TIME,
    enabled: !!teamId,
  });
}

export function useTask(taskId: string) {
  return useQuery<Task>({
    queryKey: [QUERY_KEYS.task, taskId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select('*, task_assignees(*, profiles(*))')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as Task;
    },
    staleTime: STALE_TIME,
    enabled: !!taskId,
  });
}

export function useCreateTask(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateTaskFormValues) => {
      const { supabase, userId } = await getAuthContext();

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          team_id: teamId,
          title: values.title,
          description: values.description ?? null,
          status: values.status,
          priority: values.priority,
          due_date: values.due_date ?? null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (values.assignee_ids?.length) {
        await supabase.from('task_assignees').insert(
          values.assignee_ids.map((uid) => ({ task_id: task.id, user_id: uid }))
        );
      }

      return task as Task;
    },
    onSuccess: (task) => {
      markLocalMutation(task.id);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      toast.success('Görev oluşturuldu');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Görev oluşturulamadı');
    },
  });
}

export function useUpdateTask(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, values }: { taskId: string; values: UpdateTaskFormValues }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...(values.title !== undefined && { title: values.title }),
          ...(values.description !== undefined && { description: values.description }),
          ...(values.status !== undefined && { status: values.status }),
          ...(values.priority !== undefined && { priority: values.priority }),
          ...(values.due_date !== undefined && { due_date: values.due_date || null }),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) => {
      markLocalMutation(task.id);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.task, task.id] });
      toast.success('Görev güncellendi');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Görev güncellenemedi');
    },
  });
}

export function useUpdateTaskStatus(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;
      return { taskId, status };
    },
    onMutate: async ({ taskId, status }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);

      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t)) ?? []
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Durum güncellenemedi');
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
      const supabase = createClient();
      const { error } = await supabase.from('tasks').update({ priority }).eq('id', taskId);
      if (error) throw error;
      return { taskId, priority };
    },
    onMutate: async ({ taskId, priority }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, priority } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Öncelik güncellenemedi');
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
      const supabase = createClient();
      const { error } = await supabase.from('tasks').update({ due_date: dueDate }).eq('id', taskId);
      if (error) throw error;
      return { taskId, dueDate };
    },
    onMutate: async ({ taskId, dueDate }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, due_date: dueDate } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Tarih güncellenemedi');
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
      const supabase = createClient();
      const { error } = await supabase.from('tasks').update({ title }).eq('id', taskId);
      if (error) throw error;
      return { taskId, title };
    },
    onMutate: async ({ taskId, title }) => {
      markLocalMutation(taskId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      const previous = queryClient.getQueryData<Task[]>([QUERY_KEYS.tasks, teamId]);
      queryClient.setQueryData<Task[]>([QUERY_KEYS.tasks, teamId], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, title } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Başlık güncellenemedi');
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
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);
      if (deleteError) throw deleteError;

      if (userIds.length > 0) {
        const { error: insertError } = await supabase
          .from('task_assignees')
          .insert(userIds.map((uid) => ({ task_id: taskId, user_id: uid })));
        if (insertError) throw insertError;
      }

      return { taskId, userIds };
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
        old?.map((t) => {
          if (t.id !== taskId) return t;
          const optimisticAssignees: TaskAssignee[] = userIds.map((uid) => {
            const member = members?.find((m) => m.user_id === uid);
            return {
              id: `optimistic-${uid}`,
              task_id: taskId,
              user_id: uid,
              profiles: member?.profiles as TaskAssignee['profiles'],
            };
          });
          return { ...t, task_assignees: optimisticAssignees };
        }) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.tasks, teamId], context.previous);
      }
      toast.error('Atama güncellenemedi');
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
    onSuccess: (taskId) => {
      markLocalMutation(taskId);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      toast.success('Görev silindi');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Görev silinemedi');
    },
  });
}

export function useAssignUser(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('task_assignees')
        .insert({ task_id: taskId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.task, taskId] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Kullanıcı atanamadı');
    },
  });
}

export function useUnassignUser(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks, teamId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.task, taskId] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Atama kaldırılamadı');
    },
  });
}
