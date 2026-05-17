'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar, Check, Flag, Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants';
import { cn, formatDate, getInitials } from '@/lib/utils';
import {
  useUpdateTaskStatus,
  useUpdateTaskPriority,
  useUpdateTaskDueDate,
  useUpdateTaskTitle,
  useSetTaskAssignees,
} from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeam';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';
import type { CustomListColumn } from '@/store/useListColumnsStore';

const statusBadgeStyle: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
};

const priorityBadgeStyle: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  high: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
};

const priorityLabel: Record<TaskPriority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

const cellTrigger =
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors cursor-pointer select-none';

// ---------- Title ----------

interface TitleCellProps {
  task: Task;
  teamId: string;
}

export function TitleCell({ task, teamId }: TitleCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: updateTitle } = useUpdateTaskTitle(teamId);

  useEffect(() => {
    if (!editing) setValue(task.title);
  }, [task.title, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.title) {
      updateTitle({ taskId: task.id, title: trimmed });
    } else {
      setValue(task.title);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setValue(task.title);
            setEditing(false);
          }
        }}
        className="h-7 px-2 py-1 text-sm"
      />
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <Link
        href={`/teams/${teamId}/tasks/${task.id}`}
        prefetch={false}
        className="font-medium hover:text-primary"
      >
        {task.title}
      </Link>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-[11px] text-muted-foreground hover:text-foreground transition-opacity"
        aria-label="Başlığı düzenle"
      >
        Düzenle
      </button>
    </div>
  );
}

// ---------- Status ----------

interface StatusCellProps {
  task: Task;
  teamId: string;
}

export function StatusCell({ task, teamId }: StatusCellProps) {
  const [open, setOpen] = useState(false);
  const { mutate: updateStatus } = useUpdateTaskStatus(teamId);
  const current = TASK_STATUSES.find((s) => s.value === task.status);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(cellTrigger, statusBadgeStyle[task.status])}>
          {current?.label ?? task.status}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        <div className="space-y-0.5">
          {TASK_STATUSES.map((s) => {
            const selected = s.value === task.status;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  if (!selected) updateStatus({ taskId: task.id, status: s.value });
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span>{s.label}</span>
                {selected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Priority ----------

interface PriorityCellProps {
  task: Task;
  teamId: string;
}

export function PriorityCell({ task, teamId }: PriorityCellProps) {
  const [open, setOpen] = useState(false);
  const { mutate: updatePriority } = useUpdateTaskPriority(teamId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(cellTrigger, priorityBadgeStyle[task.priority])}>
          <Flag className="h-2.5 w-2.5" />
          {priorityLabel[task.priority]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        <div className="space-y-0.5">
          {TASK_PRIORITIES.map((p) => {
            const selected = p.value === task.priority;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  if (!selected) updatePriority({ taskId: task.id, priority: p.value });
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span>{priorityLabel[p.value]}</span>
                {selected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Due date ----------

interface DueDateCellProps {
  task: Task;
  teamId: string;
}

export function DueDateCell({ task, teamId }: DueDateCellProps) {
  const [open, setOpen] = useState(false);
  const { mutate: updateDueDate } = useUpdateTaskDueDate(teamId);

  const inputValue = task.due_date ? task.due_date.slice(0, 10) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors cursor-pointer select-none',
            task.due_date
              ? 'text-muted-foreground hover:bg-accent'
              : 'text-muted-foreground/60 hover:bg-accent'
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          {task.due_date ? formatDate(task.due_date) : 'Tarih ekle'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3 space-y-2">
        <Input
          type="date"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            updateDueDate({
              taskId: task.id,
              dueDate: v ? new Date(v).toISOString() : null,
            });
          }}
          className="h-8 text-sm"
        />
        {task.due_date && (
          <button
            type="button"
            onClick={() => {
              updateDueDate({ taskId: task.id, dueDate: null });
              setOpen(false);
            }}
            className="flex w-full items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <X className="h-3 w-3" />
            Tarihi temizle
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------- Assignees ----------

interface AssigneeCellProps {
  task: Task;
  teamId: string;
}

export function AssigneeCell({ task, teamId }: AssigneeCellProps) {
  const [open, setOpen] = useState(false);
  const { data: members = [] } = useTeamMembers(teamId);
  const { mutate: setAssignees } = useSetTaskAssignees(teamId);

  const assignedIds = (task.task_assignees ?? []).map((a) => a.user_id);

  const toggle = (userId: string) => {
    const next = assignedIds.includes(userId)
      ? assignedIds.filter((id) => id !== userId)
      : [...assignedIds, userId];
    setAssignees({ taskId: task.id, userIds: next });
  };

  const assignees = task.task_assignees ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-accent cursor-pointer select-none"
        >
          {assignees.length === 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Plus className="h-3 w-3" />
              Ata
            </span>
          ) : (
            <TooltipProvider>
              <div className="flex -space-x-1.5">
                {assignees.slice(0, 3).map((a) => (
                  <Tooltip key={a.id} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary/10 text-[10px] font-semibold text-primary">
                        {getInitials(a.profiles?.full_name ?? null)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {a.profiles?.full_name ?? a.profiles?.email ?? 'Kullanıcı'}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {assignees.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-muted text-[10px] font-semibold text-muted-foreground">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            </TooltipProvider>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        {members.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            Bu ekipte henüz üye yok.
          </div>
        ) : (
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {members.map((m) => {
              const selected = assignedIds.includes(m.user_id);
              const name = m.profiles?.full_name ?? m.profiles?.email ?? 'Kullanıcı';
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggle(m.user_id)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {getInitials(m.profiles?.full_name ?? null)}
                  </div>
                  <span className="flex-1 truncate text-left">{name}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------- Custom column ----------

interface CustomCellProps {
  column: CustomListColumn;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CustomCell({ column, value, onChange }: CustomCellProps) {
  if (column.type === 'date') {
    return <CustomDateCell value={value} onChange={onChange} />;
  }

  if (column.type === 'select') {
    return <CustomSelectCell column={column} value={value} onChange={onChange} />;
  }

  return <CustomTextCell value={value} onChange={onChange} />;
}

function CustomDateCell({
  value,
  onChange,
}: Pick<CustomCellProps, 'value' | 'onChange'>) {
  const inputValue = value ? value.slice(0, 10) : '';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors cursor-pointer select-none',
            value ? 'text-muted-foreground hover:bg-accent' : 'text-muted-foreground/60 hover:bg-accent'
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          {value ? formatDate(value) : 'Tarih ekle'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2 p-3">
        <Input
          type="date"
          value={inputValue}
          onChange={(e) => {
            const nextValue = e.target.value;
            onChange(nextValue ? new Date(nextValue).toISOString() : null);
          }}
          className="h-8 text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex w-full items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <X className="h-3 w-3" />
            Tarihi temizle
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CustomSelectCell({ column, value, onChange }: CustomCellProps) {
  const options = column.options ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            cellTrigger,
            value
              ? 'border-border bg-secondary/60 text-foreground hover:bg-secondary'
              : 'border-dashed border-border text-muted-foreground hover:bg-accent'
          )}
        >
          {value || 'Seçim yap'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {options.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            Bu sütun için henüz seçenek tanımlı değil.
          </div>
        ) : (
          <div className="space-y-0.5">
            {options.map((option) => {
              const selected = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(selected ? null : option)}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span>{option}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CustomTextCell({
  value,
  onChange,
}: Pick<CustomCellProps, 'value' | 'onChange'>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [editing, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    onChange(trimmed || null);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value ?? '');
            setEditing(false);
          }
        }}
        className="h-7 px-2 py-1 text-sm"
        placeholder="Değer gir"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'min-h-7 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent',
        value ? 'text-foreground' : 'text-muted-foreground/70'
      )}
    >
      {value || 'Boş'}
    </button>
  );
}
