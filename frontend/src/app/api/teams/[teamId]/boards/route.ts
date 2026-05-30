import { NextResponse } from 'next/server';
import { authorizeTeamMember } from '@/lib/server/team-auth';
import { createBoardSchema } from '@/lib/validations/boards';
import type { Board } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const auth = await authorizeTeamMember(teamId);
    if (auth.error) return auth.error;

    if (auth.membership.role !== 'admin') {
      return NextResponse.json({ error: 'Pano oluşturmak için yönetici olmalısınız' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Geçersiz pano verisi' },
        { status: 400 }
      );
    }

    // New board goes to the end of the list.
    const { data: lastBoard } = await auth.admin
      .from('boards')
      .select('position')
      .eq('team_id', teamId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastBoard?.position ?? -1) + 1;

    const { data: board, error: insertError } = await auth.admin
      .from('boards')
      .insert({
        team_id: teamId,
        name: parsed.data.name.trim(),
        position: nextPosition,
        created_by: auth.user.id,
      })
      .select('*, board_items(*)')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ board: board as Board }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
