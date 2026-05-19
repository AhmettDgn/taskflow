// Placeholder types — replace with: supabase gen types typescript --linked > src/lib/types.ts

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TeamRole = 'admin' | 'member';
export type NotificationType = 'task_assigned' | 'status_changed' | 'comment_added';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface UserSummary {
  email: string | null;
  fullName: string | null;
}

export interface Team {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  profiles?: Profile;
}

export interface Task {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  task_assignees?: TaskAssignee[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  profiles?: Profile;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  content: string | null;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
}
