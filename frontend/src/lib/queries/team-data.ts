// Ortak query fonksiyonları — hem client hook'ları hem server prefetch tarafından
// kullanılır. Query şekli tek yerde tanımlı kalır ki hydration cache anahtarlarıyla
// birebir eşleşsin. Supabase client parametre olarak alınır (browser veya server).
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeTaskStatusColumns } from '@/lib/task-statuses';
import type { Board, Task, TaskStatusColumn, Team, TeamDocument, TeamMember } from '@/lib/types';

export async function fetchTasks(supabase: SupabaseClient, teamId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_assignees(*, profiles(*))')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function fetchTask(supabase: SupabaseClient, taskId: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_assignees(*, profiles(*))')
    .eq('id', taskId)
    .single();

  if (error) throw error;
  return data as Task;
}

export async function fetchTeams(supabase: SupabaseClient, userId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('teams(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? [])
    .map((row) => (row.teams as unknown as Team))
    .filter(Boolean);
}

export async function fetchTeam(supabase: SupabaseClient, teamId: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) throw error;
  return data as Team;
}

export async function fetchTeamMembers(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, profiles(*)')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function fetchBoards(supabase: SupabaseClient, teamId: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*, board_items(*)')
    .eq('team_id', teamId)
    .order('position', { ascending: true });

  if (error) throw error;

  const boards = (data ?? []) as Board[];
  // Keep each board's items in a stable order (the nested select isn't ordered).
  for (const board of boards) {
    board.board_items?.sort((a, b) => a.position - b.position);
  }
  return boards;
}

// Doğrudan RLS'li select; migration 007 her ekibe varsayılan kolonları yazdığı için
// API route'taki auto-insert davranışına gerek yok. Boş gelirse normalize defaults döner —
// client hook'un placeholderData davranışıyla aynı sonuç.
export async function fetchTaskStatuses(
  supabase: SupabaseClient,
  teamId: string
): Promise<TaskStatusColumn[]> {
  const { data, error } = await supabase
    .from('task_statuses')
    .select('*')
    .eq('team_id', teamId)
    .order('position', { ascending: true });

  if (error) throw error;
  return normalizeTaskStatusColumns((data ?? []) as TaskStatusColumn[]);
}

export async function fetchDocuments(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*, profiles(*)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TeamDocument[];
}
