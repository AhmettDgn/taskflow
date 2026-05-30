import { NextResponse } from 'next/server';
import { authorizeTeamMember } from '@/lib/server/team-auth';
import { sendBoardItemNotifications } from '@/lib/server/telegram';
import { boardItemSchema } from '@/lib/validations/boards';
import type { BoardItem, Profile } from '@/lib/types';

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
      .select('id, name')
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

    // Notify other team members (except the actor) via Telegram — best-effort.
    try {
      const { data: team } = await auth.admin
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .maybeSingle();

      const { data: members } = await auth.admin
        .from('team_members')
        .select('user_id, profiles(id, telegram_chat_id)')
        .eq('team_id', teamId);

      const actorName =
        auth.user.email?.split('@')[0] ?? 'Bir kullanıcı';

      const recipients = (members ?? [])
        .map((member) => member.profiles as unknown as Pick<Profile, 'id' | 'telegram_chat_id'> | null)
        .filter(
          (profile): profile is Pick<Profile, 'id' | 'telegram_chat_id'> =>
            !!profile && profile.id !== auth.user.id
        );

      if (recipients.length > 0) {
        await sendBoardItemNotifications({
          recipients,
          boardName: board.name,
          teamName: team?.name ?? 'Ekip',
          item: item as BoardItem,
          actorName,
          teamId,
          headers: request.headers,
          requestUrl: request.url,
        });
      }
    } catch {
      // Notifications must never fail the item creation.
    }

    return NextResponse.json({ item: item as BoardItem }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
