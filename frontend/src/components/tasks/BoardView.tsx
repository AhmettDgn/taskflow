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
import { Plus, X } from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types';
import { TASK_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { useUpdateTaskStatus } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface BoardViewProps {
  tasks: Task[];
  teamId: string;
}

const columnHeader: Record<TaskStatus, { dot: string; bg: string; border: string }> = {
  todo:        { dot: 'bg-slate-400',  bg: 'bg-slate-50/80',   border: 'border-slate-200/80' },
  in_progress: { dot: 'bg-blue-500',   bg: 'bg-blue-50/60',    border: 'border-blue-200/60'  },
  done:        { dot: 'bg-emerald-500', bg: 'bg-emerald-50/60', border: 'border-emerald-200/60' },
  on_hold:     { dot: 'bg-amber-400',  bg: 'bg-amber-50/60',   border: 'border-amber-200/60' },
};

function Column({
  colValue,
  colLabel,
  tasks,
  teamId,
  openFormColumn,
  setOpenFormColumn,
}: {
  colValue: TaskStatus;
  colLabel: string;
  tasks: Task[];
  teamId: string;
  openFormColumn: TaskStatus | null;
  setOpenFormColumn: (v: TaskStatus | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colValue });
  const styles = columnHeader[colValue];

  return (
    <div className="w-[17rem] flex-shrink-0">
      <div
        className={cn(
          'flex flex-col rounded-xl border p-3 transition-colors duration-150',
          styles.bg, styles.border,
          isOver && 'ring-2 ring-primary/30'
        )}
      >
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', styles.dot)} />
          <h3 className="text-sm font-semibold text-foreground">{colLabel}</h3>
          <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            {tasks.length}
          </span>
        </div>

        {/* Drop zone */}
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              'flex flex-col gap-2 min-h-[3rem] rounded-lg transition-all duration-150',
              isOver && 'bg-primary/5 p-1'
            )}
          >
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} teamId={teamId} />
            ))}
          </div>
        </SortableContext>

        {/* Inline form or add button */}
        {openFormColumn === colValue ? (
          <div className="mt-2 animate-scale-in rounded-lg border border-border bg-white p-3 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Yeni Görev</span>
              <button
                onClick={() => setOpenFormColumn(null)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <TaskForm
              teamId={teamId}
              defaultStatus={colValue}
              onSuccess={() => setOpenFormColumn(null)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setOpenFormColumn(colValue)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Görev Ekle
          </Button>
        )}
      </div>
    </div>
  );
}

export function BoardView({ tasks, teamId }: BoardViewProps) {
  const [openFormColumn, setOpenFormColumn] = useState<TaskStatus | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const { mutate: updateStatus } = useUpdateTaskStatus(teamId);

  // Sync external tasks → local (when TanStack Query refetches)
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = localTasks.find((t) => t.id === active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const overId = over.id as string;
    const isColumn = TASK_STATUSES.some((s) => s.value === overId);
    if (!isColumn) return;

    const newStatus = overId as TaskStatus;
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t))
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const overId = over.id as string;
    const isColumn = TASK_STATUSES.some((s) => s.value === overId);
    if (!isColumn) return;

    const newStatus = overId as TaskStatus;
    const originalTask = tasks.find((t) => t.id === active.id);

    if (originalTask && originalTask.status !== newStatus) {
      updateStatus({ taskId: active.id as string, status: newStatus });
    } else {
      // Revert optimistic if same column
      setLocalTasks(tasks);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setLocalTasks(tasks);
  };

  const columns = TASK_STATUSES.map((s) => ({
    ...s,
    tasks: localTasks.filter((t) => t.status === s.value),
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
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.value}
            colValue={col.value as TaskStatus}
            colLabel={col.label}
            tasks={col.tasks}
            teamId={teamId}
            openFormColumn={openFormColumn}
            setOpenFormColumn={setOpenFormColumn}
          />
        ))}
      </div>

      {/* Ghost overlay — shown while dragging */}
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
