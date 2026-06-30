'use client';

import type { TaskStatus } from '@/lib/types';
import { DEFAULT_TASK_STATUSES } from '@/lib/task-statuses';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';

interface StatusDropdownProps {
  teamId: string;
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}

export function StatusDropdown({ teamId, value, onChange }: StatusDropdownProps) {
  const { data: taskStatuses = DEFAULT_TASK_STATUSES } = useTaskStatuses(teamId);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {taskStatuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
