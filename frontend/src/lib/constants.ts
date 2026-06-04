import type { TaskStatus, TaskPriority } from './types';

export const APP_NAME = 'TaskFlow';

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'text-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'text-blue-500' },
  { value: 'done', label: 'Done', color: 'text-green-500' },
  { value: 'on_hold', label: 'On Hold', color: 'text-amber-500' },
];

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
  telegramConfig: 'telegramConfig',
} as const;

export const STALE_TIME = 30_000;
