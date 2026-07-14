'use client';

import { useState } from 'react';
import { ArrowLeft, Trash2, Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDropdown } from '@/components/tasks/StatusDropdown';
import { useTask, useUpdateTask, useDeleteTask, useSetTaskAssignees } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeam';
import { CommentSection } from '@/components/comments/CommentSection';
import { SubtaskChecklist } from '@/components/tasks/SubtaskChecklist';
import { TASK_PRIORITIES } from '@/lib/constants';
import { formatDate, getInitials } from '@/lib/utils';
import type { TaskPriority } from '@/lib/types';

interface TaskDetailPanelProps {
  teamId: string;
  taskId: string;
  /** Called when the back/close action is triggered. */
  onClose: () => void;
  /** Called after the task is deleted; falls back to onClose when omitted. */
  onDeleted?: () => void;
}

export function TaskDetailPanel({ teamId, taskId, onClose, onDeleted }: TaskDetailPanelProps) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: members = [] } = useTeamMembers(teamId);
  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask(teamId);
  const { mutateAsync: deleteTask, isPending: isDeleting } = useDeleteTask(teamId);
  const { mutate: setAssignees } = useSetTaskAssignees(teamId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  const handleDelete = async () => {
    if (!confirm('Bu gorevi silmek istediginize emin misiniz?')) return;
    await deleteTask(taskId);
    (onDeleted ?? onClose)();
  };

  const handleTitleSave = async () => {
    if (!titleValue.trim() || titleValue === task?.title) {
      setEditingTitle(false);
      return;
    }

    await updateTask({ taskId, values: { title: titleValue.trim() } });
    setEditingTitle(false);
  };

  const handleDescSave = async () => {
    if (descValue === (task?.description ?? '')) {
      setEditingDesc(false);
      return;
    }

    await updateTask({ taskId, values: { description: descValue || undefined } });
    setEditingDesc(false);
  };

  const assignedIds = task?.task_assignees?.map((assignee) => assignee.user_id) ?? [];
  const unassignedMembers = members.filter((member) => !assignedIds.includes(member.user_id));

  const handleAssignUser = (userId: string) => {
    setAssignees({ taskId, userIds: [...assignedIds, userId] });
  };

  const handleUnassignUser = (userId: string) => {
    setAssignees({ taskId, userIds: assignedIds.filter((assignedUserId) => assignedUserId !== userId) });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!task) {
    return <div className="py-12 text-center text-muted-foreground">Gorev bulunamadi.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pr-8">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Geri">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {editingTitle ? (
            <div className="flex gap-2">
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                autoFocus
                className="text-xl font-bold"
              />
              <Button size="sm" onClick={handleTitleSave} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
              </Button>
            </div>
          ) : (
            <h1
              className="cursor-pointer text-xl font-bold hover:text-primary"
              onClick={() => {
                setTitleValue(task.title);
                setEditingTitle(true);
              }}
              title="Duzenlemek icin tiklayin"
              data-testid="task-detail-title"
            >
              {task.title}
            </h1>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aciklama</p>

        {editingDesc ? (
          <div className="space-y-2">
            <textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleDescSave} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>
                Iptal
              </Button>
            </div>
          </div>
        ) : (
          <p
            className="min-h-[2rem] cursor-pointer whitespace-pre-wrap text-sm text-gray-700 hover:text-primary"
            onClick={() => {
              setDescValue(task.description ?? '');
              setEditingDesc(true);
            }}
            title="Duzenlemek icin tiklayin"
          >
            {task.description || <span className="italic text-muted-foreground">Aciklama ekleyin...</span>}
          </p>
        )}
      </div>

      <SubtaskChecklist teamId={teamId} taskId={taskId} subtasks={task.subtasks ?? []} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Durum</p>
          <StatusDropdown
            teamId={teamId}
            value={task.status}
            onChange={(status) => updateTask({ taskId, values: { status } })}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Oncelik</p>
          <select
            value={task.priority}
            onChange={(e) => updateTask({ taskId, values: { priority: e.target.value as TaskPriority } })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vade Tarihi</p>
          <Input
            type="date"
            defaultValue={task.due_date?.split('T')[0] ?? ''}
            onBlur={(e) => updateTask({ taskId, values: { due_date: e.target.value } })}
            className="text-sm"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atananlar</p>
        <div className="space-y-1.5">
          {task.task_assignees?.map((assignee) => (
            <div key={assignee.id} className="flex items-center gap-2 rounded-md p-1 hover:bg-gray-50">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {getInitials(assignee.profiles?.full_name ?? null)}
              </div>
              <span className="flex-1 truncate text-xs">
                {assignee.profiles?.full_name ?? 'Kullanici'}
              </span>
              <button
                onClick={() => handleUnassignUser(assignee.user_id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {unassignedMembers.length > 0 && (
            <div className="pt-1">
              <p className="mb-1 text-xs text-muted-foreground">Ekle:</p>
              <div className="flex flex-wrap gap-1">
                {unassignedMembers.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => handleAssignUser(member.user_id)}
                    className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:border-primary hover:text-primary"
                    title={member.profiles?.full_name ?? ''}
                  >
                    <UserPlus className="h-2.5 w-2.5" />
                    {member.profiles?.full_name?.split(' ')[0] ?? 'Kullanici'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        <CommentSection taskId={taskId} />
      </div>

      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p>Olusturuldu: {formatDate(task.created_at)}</p>
        <p>Guncellendi: {formatDate(task.updated_at)}</p>
      </div>
    </div>
  );
}
