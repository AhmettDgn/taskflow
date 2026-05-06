'use client';

import type { TaskStatus } from '@/lib/types';
import { TASK_STATUSES } from '@/lib/constants';

interface StatusDropdownProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}

export function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
