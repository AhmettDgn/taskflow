import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { updateTaskSchema } from '@/lib/validations/tasks';
import type { Task } from '@/lib/types';

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
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Gecersiz gorev verisi' },
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

    const { data: existingTask } = await admin
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (!existingTask) {
      return NextResponse.json({ error: 'Gorev bulunamadi' }, { status: 404 });
    }

    const { title, description, status, priority, due_date } = parsed.data;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (due_date !== undefined) updates.due_date = due_date?.trim() || null;

    const { data: updatedTask, error: updateError } = await admin
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('team_id', teamId)
      .select('*, task_assignees(*, profiles(*))')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ task: updatedTask as Task });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
