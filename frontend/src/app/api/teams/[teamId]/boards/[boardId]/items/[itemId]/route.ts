import { NextResponse } from 'next/server';
import { authorizeTeamMember } from '@/lib/server/team-auth';
import { updateBoardItemSchema } from '@/lib/validations/boards';
import type { BoardItem } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

async function ensureItemInTeamBoard(
  admin: SupabaseClient,
  teamId: string,
  boardId: string,
  itemId: string
) {
  const { data: board } = await admin
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!board) return false;

  const { data: item } = await admin
    .from('board_items')
    .select('id')
    .eq('id', itemId)
    .eq('board_id', boardId)
    .maybeSingle();

  return !!item;
}

export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string; boardId: string; itemId: string } }
) {
  try {
    const { teamId, boardId, itemId } = params;
    const auth = await authorizeTeamMember(teamId);
    if (auth.error) return auth.error;

    if (!(await ensureItemInTeamBoard(auth.admin, teamId, boardId, itemId))) {
      return NextResponse.json({ error: 'İçerik bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateBoardItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Geçersiz içerik verisi' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.label !== undefined) updates.label = parsed.data.label?.trim() || null;
    if (parsed.data.value !== undefined) updates.value = parsed.data.value.trim();

    const { data: item, error: updateError } = await auth.admin
      .from('board_items')
      .update(updates)
      .eq('id', itemId)
      .eq('board_id', boardId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ item: item as BoardItem });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { teamId: string; boardId: string; itemId: string } }
) {
  try {
    const { teamId, boardId, itemId } = params;
    const auth = await authorizeTeamMember(teamId);
    if (auth.error) return auth.error;

    if (!(await ensureItemInTeamBoard(auth.admin, teamId, boardId, itemId))) {
      return NextResponse.json({ error: 'İçerik bulunamadı' }, { status: 404 });
    }

    const { error: deleteError } = await auth.admin
      .from('board_items')
      .delete()
      .eq('id', itemId)
      .eq('board_id', boardId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
