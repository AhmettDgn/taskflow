// Placeholder types — replace with: supabase gen types typescript --linked > src/lib/types.ts

export type TaskStatus = string;
export type TaskPriority = 'low' | 'medium' | 'high';
export type TeamRole = 'admin' | 'member';
export type NotificationType = 'task_assigned' | 'status_changed' | 'comment_added';
export type AssignmentNotificationWarningReason = 'telegram_not_linked' | 'telegram_send_failed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  telegram_chat_id: string | null;
}

export interface TelegramLinkResponse {
  deepLink: string;
  botUsername: string;
  expiresAt: string;
}

export interface TelegramConfigStatus {
  isAdmin: boolean;
  configured?: boolean;
  botUsername?: string | null;
  webhookRegistered?: boolean;
  webhookUrl?: string;
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

export interface TaskStatusColumn {
  id?: string;
  team_id?: string;
  value: TaskStatus;
  label: string;
  color: string;
  position: number;
  created_at?: string;
  updated_at?: string;
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

export interface AssignmentNotificationWarning {
  user_id: string;
  recipient_name: string;
  reason: AssignmentNotificationWarningReason;
  message: string;
}

export type BoardItemType = 'link' | 'password' | 'note';

export interface BoardItem {
  id: string;
  board_id: string;
  type: BoardItemType;
  label: string | null;
  value: string;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamDocument {
  id: string;
  team_id: string;
  name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface Board {
  id: string;
  team_id: string;
  name: string;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  board_items?: BoardItem[];
}
