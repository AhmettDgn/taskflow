'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiPath } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/constants';
import { DEFAULT_TASK_STATUSES, normalizeTaskStatusColumns } from '@/lib/task-statuses';
import type { TaskStatusColumn } from '@/lib/types';

async function readJson(response: Response) {
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? 'Kolon bilgisi guncellenemedi');
  }
  return json;
}

export function useTaskStatuses(teamId: string) {
  return useQuery<TaskStatusColumn[]>({
    queryKey: [QUERY_KEYS.taskStatuses, teamId],
    queryFn: async () => {
      const response = await fetch(getApiPath(`/teams/${teamId}/task-statuses`), {
        credentials: 'include',
      });
      const json = await readJson(response) as { statuses: TaskStatusColumn[] };
      return normalizeTaskStatusColumns(json.statuses);
    },
    enabled: !!teamId,
    placeholderData: DEFAULT_TASK_STATUSES,
  });
}

export function useCreateTaskStatusColumn(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ label }: { label: string }) => {
      const response = await fetch(getApiPath(`/teams/${teamId}/task-statuses`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label }),
      });
      const json = await readJson(response) as { status: TaskStatusColumn };
      return json.status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.taskStatuses, teamId] });
      toast.success('Kolon eklendi');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateTaskStatusColumn(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ value, label }: { value: string; label: string }) => {
      const response = await fetch(getApiPath(`/teams/${teamId}/task-statuses`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value, label }),
      });
      const json = await readJson(response) as { status: TaskStatusColumn };
      return json.status;
    },
    onMutate: async ({ value, label }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.taskStatuses, teamId] });
      const previous = queryClient.getQueryData<TaskStatusColumn[]>([QUERY_KEYS.taskStatuses, teamId]);
      queryClient.setQueryData<TaskStatusColumn[]>([QUERY_KEYS.taskStatuses, teamId], (old) =>
        (old ?? DEFAULT_TASK_STATUSES).map((status) =>
          status.value === value ? { ...status, label } : status
        )
      );
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.taskStatuses, teamId], context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.taskStatuses, teamId] });
    },
  });
}
