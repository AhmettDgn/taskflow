'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ListChecks, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTask } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeam';
import { createTaskSchema, type CreateTaskFormValues } from '@/lib/validations/tasks';
import { TASK_PRIORITIES } from '@/lib/constants';
import { DEFAULT_TASK_STATUSES } from '@/lib/task-statuses';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { getInitials } from '@/lib/utils';

interface TaskFormProps {
  teamId: string;
  defaultStatus?: CreateTaskFormValues['status'];
  onSuccess?: () => void;
}

export function TaskForm({ teamId, defaultStatus = 'todo', onSuccess }: TaskFormProps) {
  const { mutateAsync: createTask, isPending } = useCreateTask(teamId);
  const { data: members = [] } = useTeamMembers(teamId);
  const { data: taskStatuses = DEFAULT_TASK_STATUSES } = useTaskStatuses(teamId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { status: defaultStatus, priority: 'medium', assignee_ids: [] },
  });

  const selectedAssignees = watch('assignee_ids') ?? [];
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState('');

  const toggleAssignee = (userId: string) => {
    const current = selectedAssignees;
    setValue(
      'assignee_ids',
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const addSubtask = () => {
    const title = subtaskDraft.trim();
    if (!title || subtasks.length >= 30) return;
    setSubtasks((current) => [...current, title]);
    setSubtaskDraft('');
  };

  const removeSubtask = (index: number) => {
    setSubtasks((current) => current.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: CreateTaskFormValues) => {
    await createTask({ ...values, subtasks });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Başlık *</Label>
        <Input
          id="title"
          placeholder="Görev başlığı"
          disabled={isPending}
          {...register('title')}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <textarea
          id="description"
          placeholder="Görev hakkında açıklama..."
          rows={3}
          disabled={isPending}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Durum</Label>
          <select
            id="status"
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('status')}
          >
            {taskStatuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Öncelik</Label>
          <select
            id="priority"
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('priority')}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_date">Vade Tarihi</Label>
        <Input
          id="due_date"
          type="date"
          disabled={isPending}
          {...register('due_date')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtask-input" className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          Alt Görevler
        </Label>

        {subtasks.length > 0 && (
          <ul className="space-y-1">
            {subtasks.map((title, index) => (
              <li
                key={`${title}-${index}`}
                className="flex items-center gap-2 rounded-md border border-border bg-gray-50/60 px-3 py-1.5 text-sm"
              >
                <span className="h-3.5 w-3.5 flex-shrink-0 rounded border border-input bg-white" />
                <span className="flex-1 truncate">{title}</span>
                <button
                  type="button"
                  onClick={() => removeSubtask(index)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`${title} alt görevini kaldır`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Input
            id="subtask-input"
            placeholder="Alt görev ekle ve Enter'a bas..."
            value={subtaskDraft}
            disabled={isPending}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addSubtask}
            disabled={isPending || !subtaskDraft.trim()}
            aria-label="Alt görev ekle"
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {members.length > 0 && (
        <div className="space-y-2">
          <Label>Atananlar</Label>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const isSelected = selectedAssignees.includes(member.user_id);
              return (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => toggleAssignee(member.user_id)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-white text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {getInitials(member.profiles?.full_name ?? null)}
                  </span>
                  {member.profiles?.full_name ?? 'Kullanıcı'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Görevi Oluştur
      </Button>
    </form>
  );
}
