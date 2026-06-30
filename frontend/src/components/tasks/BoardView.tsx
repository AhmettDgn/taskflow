'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Check, Loader2, Pencil, Plus, X } from 'lucide-react';
import type { Task, TaskStatus, TaskStatusColumn } from '@/lib/types';
import { DEFAULT_TASK_STATUSES, normalizeTaskStatusColumns } from '@/lib/task-statuses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { useUpdateTaskStatus } from '@/hooks/useTasks';
import {
  useCreateTaskStatusColumn,
  useTaskStatuses,
  useUpdateTaskStatusColumn,
} from '@/hooks/useTaskStatuses';
import { cn } from '@/lib/utils';

interface BoardViewProps {
  tasks: Task[];
  teamId: string;
}

const columnTone: Record<string, { dot: string; bg: string; border: string }> = {
  slate: { dot: 'bg-slate-400', bg: 'bg-slate-50/80', border: 'border-slate-200/80' },
  blue: { dot: 'bg-blue-500', bg: 'bg-blue-50/60', border: 'border-blue-200/60' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50/60', border: 'border-emerald-200/60' },
  amber: { dot: 'bg-amber-400', bg: 'bg-amber-50/60', border: 'border-amber-200/60' },
  rose: { dot: 'bg-rose-500', bg: 'bg-rose-50/60', border: 'border-rose-200/60' },
  violet: { dot: 'bg-violet-500', bg: 'bg-violet-50/60', border: 'border-violet-200/60' },
  cyan: { dot: 'bg-cyan-500', bg: 'bg-cyan-50/60', border: 'border-cyan-200/60' },
};

function getColumnTone(color: string) {
  return columnTone[color] ?? columnTone.slate;
}

function EditableColumnTitle({
  column,
  onRename,
  isPending,
}: {
  column: TaskStatusColumn;
  onRename: (value: string, label: string) => void;
  isPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.label);

  useEffect(() => {
    if (!editing) setDraft(column.label);
  }, [column.label, editing]);

  const commit = () => {
    const label = draft.trim();
    if (label && label !== column.label) {
      onRename(column.value, label);
    } else {
      setDraft(column.label);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') {
              setDraft(column.label);
              setEditing(false);
            }
          }}
          autoFocus
          disabled={isPending}
          className="h-7 min-w-0 px-2 text-sm font-semibold"
          aria-label="Kolon adını düzenle"
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={commit}
          disabled={isPending}
          className="rounded p-1 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-50"
          aria-label="Kolon adını kaydet"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/title flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-white/70"
      title="Kolon adını düzenle"
    >
      <h3 className="truncate text-sm font-semibold text-foreground">{column.label}</h3>
      <Pencil className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
    </button>
  );
}

function Column({
  column,
  tasks,
  teamId,
  openFormColumn,
  setOpenFormColumn,
  onRenameColumn,
  isRenaming,
}: {
  column: TaskStatusColumn;
  tasks: Task[];
  teamId: string;
  openFormColumn: TaskStatus | null;
  setOpenFormColumn: (value: TaskStatus | null) => void;
  onRenameColumn: (value: string, label: string) => void;
  isRenaming: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.value });
  const styles = getColumnTone(column.color);

  return (
    <div className="w-[17rem] flex-shrink-0">
      <div
        className={cn(
          'flex flex-col rounded-xl border p-3 transition-colors duration-150',
          styles.bg,
          styles.border,
          isOver && 'ring-2 ring-primary/30'
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', styles.dot)} />
          <EditableColumnTitle column={column} onRename={onRenameColumn} isPending={isRenaming} />
          <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            {tasks.length}
          </span>
        </div>

        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              'flex min-h-[3rem] flex-col gap-2 rounded-lg transition-all duration-150',
              isOver && 'bg-primary/5 p-1'
            )}
          >
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} teamId={teamId} />
            ))}
          </div>
        </SortableContext>

        {openFormColumn === column.value ? (
          <div className="mt-2 animate-scale-in rounded-lg border border-border bg-white p-3 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Yeni Görev</span>
              <button
                type="button"
                onClick={() => setOpenFormColumn(null)}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Formu kapat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <TaskForm
              teamId={teamId}
              defaultStatus={column.value}
              onSuccess={() => setOpenFormColumn(null)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setOpenFormColumn(column.value)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Görev Ekle
          </Button>
        )}
      </div>
    </div>
  );
}

function AddColumn({ onAdd, isPending }: { onAdd: (label: string) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');

  const commit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setLabel('');
    setOpen(false);
  };

  if (open) {
    return (
      <div className="w-[17rem] flex-shrink-0 rounded-xl border border-dashed border-border bg-white/80 p-3">
        <div className="space-y-2">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') setOpen(false);
            }}
            autoFocus
            disabled={isPending}
            placeholder="Kolon adı"
            className="h-9"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={commit} disabled={isPending || !label.trim()}>
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Ekle
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              İptal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-24 w-[17rem] flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white/60 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-white hover:text-foreground"
    >
      <Plus className="h-4 w-4" />
      Kolon Ekle
    </button>
  );
}

export function BoardView({ tasks, teamId }: BoardViewProps) {
  const [openFormColumn, setOpenFormColumn] = useState<TaskStatus | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const { data: taskStatuses = DEFAULT_TASK_STATUSES } = useTaskStatuses(teamId);
  const { mutate: updateStatus } = useUpdateTaskStatus(teamId);
  const { mutate: createColumn, isPending: isCreatingColumn } = useCreateTaskStatusColumn(teamId);
  const { mutate: renameColumn, isPending: isRenamingColumn } = useUpdateTaskStatusColumn(teamId);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = localTasks.find((item) => item.id === active.id);
    setActiveTask(task ?? null);
  };

  const statusColumns = normalizeTaskStatusColumns(taskStatuses);
  const knownStatusValues = new Set(statusColumns.map((status) => status.value));
  const orphanColumns = Array.from(
    new Set(localTasks.map((task) => task.status).filter((status) => !knownStatusValues.has(status)))
  ).map((status, index) => ({
    value: status,
    label: status,
    color: 'slate',
    position: statusColumns.length + index,
  }));
  const boardColumns = [...statusColumns, ...orphanColumns];

  const resolveDropStatus = (overId: string | null, taskItems: Task[]) => {
    if (!overId) return null;

    if (boardColumns.some((status) => status.value === overId)) {
      return overId as TaskStatus;
    }

    return taskItems.find((task) => task.id === overId)?.status ?? null;
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const newStatus = resolveDropStatus(over?.id as string | null, localTasks);
    if (!newStatus) return;

    setLocalTasks((previous) => {
      const activeTask = previous.find((task) => task.id === active.id);

      if (!activeTask || activeTask.status === newStatus) {
        return previous;
      }

      return previous.map((task) =>
        task.id === active.id ? { ...task, status: newStatus } : task
      );
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    const newStatus = resolveDropStatus(over?.id as string | null, localTasks);
    if (!newStatus) {
      setLocalTasks(tasks);
      return;
    }

    const originalTask = tasks.find((task) => task.id === active.id);

    if (originalTask && originalTask.status !== newStatus) {
      updateStatus({ taskId: active.id as string, status: newStatus });
    } else {
      setLocalTasks(tasks);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setLocalTasks(tasks);
  };

  const columns = boardColumns.map((status) => ({
    ...status,
    tasks: localTasks.filter((task) => task.status === status.value),
  }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-w-0 overflow-x-auto overscroll-x-contain pb-4">
        <div className="flex min-w-max gap-4">
          {columns.map((column) => (
            <Column
              key={column.value}
              column={column}
              tasks={column.tasks}
              teamId={teamId}
              openFormColumn={openFormColumn}
              setOpenFormColumn={setOpenFormColumn}
              onRenameColumn={(value, label) => renameColumn({ value, label })}
              isRenaming={isRenamingColumn}
            />
          ))}
          <AddColumn onAdd={(label) => createColumn({ label })} isPending={isCreatingColumn} />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="rotate-1 scale-105 opacity-95">
            <TaskCard task={activeTask} teamId={teamId} isOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
