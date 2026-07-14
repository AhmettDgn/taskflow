import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendTaskAssignmentNotifications } from '@/lib/server/telegram';
import { createTaskSchema } from '@/lib/validations/tasks';
import { DEFAULT_TASK_STATUSES } from '@/lib/task-statuses';
import type { Profile, Task } from '@/lib/types';

function getFallbackFullName(user: {
  email?: string | null;
  user_metadata?: { full_name?: string | null; avatar_url?: string | null };
}) {
  return user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null;
}


async function isValidTaskStatus(admin: ReturnType<typeof createAdminClient>, teamId: string, status: string) {
  const { data, error } = await admin
    .from('task_statuses')
    .select('value')
    .eq('team_id', teamId)
    .eq('value', status)
    .maybeSingle();

  if (data) return true;

  if (error) {
    return DEFAULT_TASK_STATUSES.some((item) => item.value === status);
  }

  return DEFAULT_TASK_STATUSES.some((item) => item.value === status);
}

function uniqueIds(userIds: string[] | undefined) {
  return Array.from(new Set((userIds ?? []).map((value) => value.trim()).filter(Boolean)));
}

export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Gecersiz gorev verisi' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    await admin.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        full_name: getFallbackFullName(user),
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    const { data: membership } = await admin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    }

    const { data: team } = await admin
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .maybeSingle();

    if (!team) {
      return NextResponse.json({ error: 'Ekip bulunamadi' }, { status: 404 });
    }

    const validStatus = await isValidTaskStatus(admin, teamId, parsed.data.status);

    if (!validStatus) {
      return NextResponse.json({ error: 'Geçersiz görev durumu' }, { status: 400 });
    }

    const assigneeIds = uniqueIds(parsed.data.assignee_ids);

    if (assigneeIds.length > 0) {
      const { data: members, error: membersError } = await admin
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .in('user_id', assigneeIds);

      if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 400 });
      }

      const foundIds = new Set((members ?? []).map((member) => member.user_id));
      if (foundIds.size !== assigneeIds.length) {
        return NextResponse.json({ error: 'Atanan kullanicilar ekip uyesi olmali' }, { status: 400 });
      }
    }

    const { data: createdTask, error: taskError } = await admin
      .from('tasks')
      .insert({
        team_id: teamId,
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        due_date: parsed.data.due_date?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 400 });
    }

    if (assigneeIds.length > 0) {
      const { error: insertError } = await admin
        .from('task_assignees')
        .insert(assigneeIds.map((userId) => ({ task_id: createdTask.id, user_id: userId })));

      if (insertError) {
        await admin.from('tasks').delete().eq('id', createdTask.id);
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }

    const subtaskTitles = (parsed.data.subtasks ?? [])
      .map((title) => title.trim())
      .filter(Boolean);

    if (subtaskTitles.length > 0) {
      const { error: subtaskError } = await admin.from('subtasks').insert(
        subtaskTitles.map((title, index) => ({
          task_id: createdTask.id,
          title,
          position: index,
          created_by: user.id,
        }))
      );

      if (subtaskError) {
        await admin.from('tasks').delete().eq('id', createdTask.id);
        return NextResponse.json({ error: subtaskError.message }, { status: 400 });
      }
    }

    const { data: task } = await admin
      .from('tasks')
      .select('*, task_assignees(*, profiles(*)), subtasks(*)')
      .eq('id', createdTask.id)
      .single();

    let warnings = [] as Awaited<ReturnType<typeof sendTaskAssignmentNotifications>>;

    if (assigneeIds.length > 0) {
      const { data: recipients } = await admin
        .from('profiles')
        .select('*')
        .in('id', assigneeIds);

      warnings = await sendTaskAssignmentNotifications({
        recipients: (recipients ?? []) as Profile[],
        task: createdTask as Task,
        teamName: team.name,
        assignerName: getFallbackFullName(user) ?? 'Kullanici',
        teamId,
        headers: request.headers,
        requestUrl: request.url,
      });
    }

    return NextResponse.json(
      {
        task: ((task ?? createdTask) as Task),
        warnings,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
