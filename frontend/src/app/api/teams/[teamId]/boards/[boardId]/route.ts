import { NextResponse } from 'next/server';
import { authorizeTeamMember } from '@/lib/server/team-auth';
import { updateBoardSchema } from '@/lib/validations/boards';
import type { Board } from '@/lib/types';

async function requireBoardAdmin(teamId: string, boardId: string) {
  const auth = await authorizeTeamMember(teamId);
  if (auth.error) return { error: auth.error };

  if (auth.membership.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Bu işlem için yönetici olmalısınız' }, { status: 403 }) };
  }

  const { data: board } = await auth.admin
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!board) {
    return { error: NextResponse.json({ error: 'Pano bulunamadı' }, { status: 404 }) };
  }

  return { admin: auth.admin };
}

export async function PATCH(
  request: Request,
  { params }: { params: { teamId: string; boardId: string } }
) {
  try {
    const { teamId, boardId } = params;
    const result = await requireBoardAdmin(teamId, boardId);
    if (result.error) return result.error;

    const body = await request.json();
    const parsed = updateBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Geçersiz pano verisi' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.position !== undefined) updates.position = parsed.data.position;

    const { data: board, error: updateError } = await result.admin
      .from('boards')
      .update(updates)
      .eq('id', boardId)
      .eq('team_id', teamId)
      .select('*, board_items(*)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ board: board as Board });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { teamId: string; boardId: string } }
) {
  try {
    const { teamId, boardId } = params;
    const result = await requireBoardAdmin(teamId, boardId);
    if (result.error) return result.error;

    const { error: deleteError } = await result.admin
      .from('boards')
      .delete()
      .eq('id', boardId)
      .eq('team_id', teamId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
