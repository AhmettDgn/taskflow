import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendTaskAssignmentNotifications } from '@/lib/server/telegram';
import { setTaskAssigneesSchema } from '@/lib/validations/tasks';
import type { Profile, Task } from '@/lib/types';

function uniqueIds(userIds: string[]) {
  return Array.from(new Set(userIds.map((value) => value.trim()).filter(Boolean)));
}

function getFallbackFullName(user: {
  email?: string | null;
  user_metadata?: { full_name?: string | null };
}) {
  return user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Kullanici';
}

export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string; taskId: string } }
) {
  try {
    const { teamId, taskId } = params;
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = setTaskAssigneesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Gecersiz atama verisi' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    }

    const { data: task } = await admin
      .from('tasks')
      .select('id, title, status, priority, due_date, team_id, description')
      .eq('id', taskId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (!task) {
      return NextResponse.json({ error: 'Gorev bulunamadi' }, { status: 404 });
    }

    const nextUserIds = uniqueIds(parsed.data.userIds);

    if (nextUserIds.length > 0) {
      const { data: members, error: membersError } = await admin
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .in('user_id', nextUserIds);

      if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 400 });
      }

      const foundIds = new Set((members ?? []).map((member) => member.user_id));
      if (foundIds.size !== nextUserIds.length) {
        return NextResponse.json({ error: 'Atanan kullanicilar ekip uyesi olmali' }, { status: 400 });
      }
    }

    const { data: currentAssignees, error: currentError } = await admin
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId);

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 400 });
    }

    const currentUserIds = (currentAssignees ?? []).map((assignee) => assignee.user_id);
    const currentSet = new Set(currentUserIds);
    const nextSet = new Set(nextUserIds);
    const toAdd = nextUserIds.filter((userId) => !currentSet.has(userId));
    const toRemove = currentUserIds.filter((userId) => !nextSet.has(userId));

    if (toRemove.length > 0 && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Atama kaldirmak icin admin olmaniz gerekir' }, { status: 403 });
    }

    if (toRemove.length > 0) {
      const { error: deleteError } = await admin
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .in('user_id', toRemove);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }
    }

    if (toAdd.length > 0) {
      const { error: insertError } = await admin
        .from('task_assignees')
        .insert(toAdd.map((userId) => ({ task_id: taskId, user_id: userId })));

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }

    const { data: team } = await admin
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    let warnings = [] as Awaited<ReturnType<typeof sendTaskAssignmentNotifications>>;

    if (toAdd.length > 0) {
      const { data: recipients } = await admin
        .from('profiles')
        .select('*')
        .in('id', toAdd);

      warnings = await sendTaskAssignmentNotifications({
        recipients: (recipients ?? []) as Profile[],
        task: task as Task,
        teamName: team?.name ?? 'Ekip',
        assignerName: getFallbackFullName(user),
        teamId,
        headers: request.headers,
        requestUrl: request.url,
      });
    }

    const { data: updatedTask, error: updatedTaskError } = await admin
      .from('tasks')
      .select('*, task_assignees(*, profiles(*))')
      .eq('id', taskId)
      .single();

    if (updatedTaskError) {
      return NextResponse.json({ error: updatedTaskError.message }, { status: 400 });
    }

    return NextResponse.json({
      task: updatedTask as Task,
      warnings,
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
