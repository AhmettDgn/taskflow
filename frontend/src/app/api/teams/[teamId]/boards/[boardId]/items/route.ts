import { NextResponse } from 'next/server';
import { authorizeTeamMember } from '@/lib/server/team-auth';
import { boardItemSchema } from '@/lib/validations/boards';
import type { BoardItem } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { teamId: string; boardId: string } }
) {
  try {
    const { teamId, boardId } = params;
    const auth = await authorizeTeamMember(teamId);
    if (auth.error) return auth.error;

    const { data: board } = await auth.admin
      .from('boards')
      .select('id')
      .eq('id', boardId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (!board) {
      return NextResponse.json({ error: 'Pano bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = boardItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Geçersiz içerik verisi' },
        { status: 400 }
      );
    }

    const { data: lastItem } = await auth.admin
      .from('board_items')
      .select('position')
      .eq('board_id', boardId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastItem?.position ?? -1) + 1;

    const { data: item, error: insertError } = await auth.admin
      .from('board_items')
      .insert({
        board_id: boardId,
        type: parsed.data.type,
        label: parsed.data.label?.trim() || null,
        value: parsed.data.value.trim(),
        position: nextPosition,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ item: item as BoardItem }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
