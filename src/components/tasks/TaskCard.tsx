'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDate, getInitials, cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  teamId: string;
  isDragging?: boolean;
  /** When true, renders without dnd listeners (used in DragOverlay) */
  isOverlay?: boolean;
}

const priorityStripe: Record<Task['priority'], string> = {
  low: 'bg-slate-300',
  medium: 'bg-amber-400',
  high: 'bg-rose-500',
};

const priorityLabel: Record<Task['priority'], string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

export function TaskCard({ task, teamId, isDragging = false, isOverlay = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id, disabled: isOverlay });

  const style = isOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  const dragging = isDragging || isSortableDragging;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className={cn(
        'group relative rounded-lg bg-white p-3 select-none',
        'border border-border',
        'shadow-card transition-all duration-150',
        dragging
          ? 'opacity-40 scale-[0.97]'
          : 'hover:shadow-card-hover hover:-translate-y-px cursor-grab active:cursor-grabbing'
      )}
    >
      {/* Priority stripe */}
      <span
        className={cn(
          'absolute left-0 inset-y-2.5 w-[3px] rounded-full',
          priorityStripe[task.priority]
        )}
      />

      {/* Title — clickable link, pointerdown doesn't fire drag when not moved */}
      <Link
        href={`/teams/${teamId}/tasks/${task.id}`}
        className="block text-sm font-medium leading-snug text-foreground hover:text-primary transition-colors pl-3"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => dragging && e.preventDefault()}
        tabIndex={-1}
      >
        {task.title}
      </Link>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-3">
        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[10px] font-medium"
          title={`Öncelik: ${priorityLabel[task.priority]}`}
        >
          {priorityLabel[task.priority]}
        </Badge>

        {task.due_date && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">
            <Calendar className="mr-1 h-2.5 w-2.5" />
            {formatDate(task.due_date)}
          </Badge>
        )}
      </div>

      {/* Assignees */}
      {task.task_assignees && task.task_assignees.length > 0 && (
        <TooltipProvider>
          <div className="mt-2 flex -space-x-1.5 pl-3">
            {task.task_assignees.slice(0, 4).map((a) => (
              <Tooltip key={a.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary/10 text-[10px] font-semibold text-primary ring-0 hover:z-10">
                    {getInitials(a.profiles?.full_name ?? null)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {a.profiles?.full_name ?? 'Kullanıcı'}
                </TooltipContent>
              </Tooltip>
            ))}
            {task.task_assignees.length > 4 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-muted text-[10px] font-semibold text-muted-foreground">
                +{task.task_assignees.length - 4}
              </div>
            )}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
