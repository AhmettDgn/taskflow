import type { TaskStatusColumn } from './types';

export const DEFAULT_TASK_STATUSES: TaskStatusColumn[] = [
  { value: 'todo', label: 'To Do', color: 'slate', position: 0 },
  { value: 'in_progress', label: 'In Progress', color: 'blue', position: 1 },
  { value: 'done', label: 'Done', color: 'emerald', position: 2 },
  { value: 'on_hold', label: 'On Hold', color: 'amber', position: 3 },
];

export const TASK_STATUS_COLORS = ['slate', 'blue', 'emerald', 'amber', 'rose', 'violet', 'cyan'] as const;

export function getTaskStatusLabel(status: string, columns: TaskStatusColumn[] = DEFAULT_TASK_STATUSES) {
  return columns.find((column) => column.value === status)?.label ?? status;
}

export function getTaskStatusTone(status: string, columns: TaskStatusColumn[] = DEFAULT_TASK_STATUSES) {
  return columns.find((column) => column.value === status)?.color ?? 'slate';
}

export function normalizeTaskStatusColumns(columns: TaskStatusColumn[] | null | undefined) {
  const source = columns && columns.length > 0 ? columns : DEFAULT_TASK_STATUSES;

  return [...source].sort((a, b) => a.position - b.position);
}

export function createStatusValue(label: string, existingValues: string[]) {
  const base =
    label
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'status';

  const existing = new Set(existingValues);
  let value = base;
  let suffix = 2;

  while (existing.has(value)) {
    value = `${base}_${suffix}`;
    suffix += 1;
  }

  return value;
}
