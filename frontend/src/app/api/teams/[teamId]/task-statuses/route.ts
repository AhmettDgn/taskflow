import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TASK_STATUSES, TASK_STATUS_COLORS, createStatusValue, normalizeTaskStatusColumns } from '@/lib/task-statuses';
import type { TaskStatusColumn } from '@/lib/types';

function cleanLabel(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function getMembership(teamId: string, userId: string) {
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  return membership;
}

async function requireUserAndMembership(teamId: string) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const membership = await getMembership(teamId, user.id);

  if (!membership) {
    return { error: NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 }) };
  }

  return { user, membership };
}

async function listStatuses(teamId: string) {
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

export async function GET(_request: Request, { params }: { params: { teamId: string } }) {
  try {
    const auth = await requireUserAndMembership(params.teamId);
    if ('error' in auth) return auth.error;

    const statuses = await listStatuses(params.teamId);
    return NextResponse.json({ statuses });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sunucu hatasi' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { teamId: string } }) {
  try {
    const auth = await requireUserAndMembership(params.teamId);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const label = cleanLabel(body.label);

    if (!label) {
      return NextResponse.json({ error: 'Kolon adı gerekli' }, { status: 400 });
    }

    if (label.length > 40) {
      return NextResponse.json({ error: 'Kolon adı en fazla 40 karakter olabilir' }, { status: 400 });
    }

    const existing = await listStatuses(params.teamId);
    const value = createStatusValue(label, existing.map((status) => status.value));
    const position = existing.reduce((max, status) => Math.max(max, status.position), -1) + 1;
    const color = TASK_STATUS_COLORS[position % TASK_STATUS_COLORS.length];

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('task_statuses')
      .insert({ team_id: params.teamId, value, label, color, position })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ status: data as TaskStatusColumn }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sunucu hatasi' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { teamId: string } }) {
  try {
    const auth = await requireUserAndMembership(params.teamId);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const value = typeof body.value === 'string' ? body.value.trim() : '';
    const label = cleanLabel(body.label);

    if (!value || !label) {
      return NextResponse.json({ error: 'Kolon bilgisi eksik' }, { status: 400 });
    }

    if (label.length > 40) {
      return NextResponse.json({ error: 'Kolon adı en fazla 40 karakter olabilir' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('task_statuses')
      .update({ label, updated_at: new Date().toISOString() })
      .eq('team_id', params.teamId)
      .eq('value', value)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ status: data as TaskStatusColumn });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sunucu hatasi' },
      { status: 500 }
    );
  }
}
