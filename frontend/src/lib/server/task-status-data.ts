import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_TASK_STATUSES, normalizeTaskStatusColumns } from '@/lib/task-statuses';
import type { TaskStatusColumn } from '@/lib/types';

// Ekip kolonlarını listeler; hiç kayıt yoksa varsayılanları oluşturur.
// Hem /api/teams/[teamId]/task-statuses route'u hem server prefetch kullanır.
// Çağıranın ekip üyeliğini önceden doğrulamış olması gerekir (admin client kullanır).
export async function listTaskStatuses(teamId: string): Promise<TaskStatusColumn[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('task_statuses')
    .select('*')
    .eq('team_id', teamId)
    .order('position', { ascending: true });

  if (error) throw error;

  if (data && data.length > 0) {
    return normalizeTaskStatusColumns(data as TaskStatusColumn[]);
  }

  const defaults = DEFAULT_TASK_STATUSES.map((status) => ({
    team_id: teamId,
    value: status.value,
    label: status.label,
    color: status.color,
    position: status.position,
  }));

  const { data: inserted, error: insertError } = await admin
    .from('task_statuses')
    .insert(defaults)
    .select('*')
    .order('position', { ascending: true });

  if (insertError) throw insertError;
  return normalizeTaskStatusColumns(inserted as TaskStatusColumn[]);
}
