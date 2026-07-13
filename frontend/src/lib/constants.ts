import type { TaskPriority } from './types';
import { DEFAULT_TASK_STATUSES } from './task-statuses';

export const APP_NAME = 'TaskFlow';

export const TASK_STATUSES = DEFAULT_TASK_STATUSES;

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const QUERY_KEYS = {
  tasks: 'tasks',
  task: 'task',
  teams: 'teams',
  team: 'team',
  members: 'members',
  comments: 'comments',
  notifications: 'notifications',
  profile: 'profile',
  boards: 'boards',
  documents: 'documents',
  taskStatuses: 'taskStatuses',
  telegramConfig: 'telegramConfig',
} as const;

export const STALE_TIME = 30_000;
