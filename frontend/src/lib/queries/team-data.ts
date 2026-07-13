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

// Tek network turu: board/list sayfalarının ihtiyacı olan her şey (ekip + görevler +
// kolonlar + üyeler) PostgREST iç içe embed ile tek sorguda gelir. Sunucu↔Supabase
// RTT'si yüksek ortamlarda 3-4 ayrı sorgunun toplam maliyetini tek tura indirir.
export interface TeamPageBundle {
  team: Team;
  tasks: Task[];
  taskStatuses: TaskStatusColumn[];
  members: TeamMember[];
}

export async function fetchTeamPageBundle(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamPageBundle> {
  const { data, error } = await supabase
    .from('teams')
    .select(
      '*, tasks(*, task_assignees(*, profiles(*))), task_statuses(*), team_members(*, profiles(*))'
    )
    .eq('id', teamId)
    .single();

  if (error) throw error;

  const { tasks, task_statuses, team_members, ...team } = data as Team & {
    tasks: Task[];
    task_statuses: TaskStatusColumn[];
    team_members: TeamMember[];
  };

  return {
    team: team as Team,
    // Embed sıralaması garanti değil; client hook'ların beklediği sıralamalar JS'te uygulanır.
    tasks: [...(tasks ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    taskStatuses: normalizeTaskStatusColumns(task_statuses ?? []),
    members: [...(team_members ?? [])].sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
  };
}

// /tasks sayfası: kullanıcının tüm ekipleri + her ekibin görevleri ve kolonları tek turda.
export interface TeamsTaskData {
  teams: Team[];
  tasksByTeam: Map<string, Task[]>;
  statusesByTeam: Map<string, TaskStatusColumn[]>;
}

export async function fetchTeamsTaskData(
  supabase: SupabaseClient,
  userId: string
): Promise<TeamsTaskData> {
  const { data, error } = await supabase
    .from('team_members')
    .select('joined_at, teams(*, tasks(*, task_assignees(*, profiles(*))), task_statuses(*))')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  const teams: Team[] = [];
  const tasksByTeam = new Map<string, Task[]>();
  const statusesByTeam = new Map<string, TaskStatusColumn[]>();

  for (const row of data ?? []) {
    const embedded = row.teams as unknown as
      | (Team & { tasks?: Task[]; task_statuses?: TaskStatusColumn[] })
      | null;
    if (!embedded) continue;

    const { tasks, task_statuses, ...team } = embedded;
    teams.push(team as Team);
    tasksByTeam.set(
      team.id,
      [...(tasks ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
    statusesByTeam.set(team.id, normalizeTaskStatusColumns(task_statuses ?? []));
  }

  return { teams, tasksByTeam, statusesByTeam };
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
