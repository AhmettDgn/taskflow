import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildBotDeepLink, resolveBotUsername } from '@/lib/server/telegram';

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getAuthedUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Generates a single-use deep-link so the caller can connect their Telegram
 * account without copying a chat id. The token is stored on the profile and
 * consumed by the webhook when the user taps Start.
 */
export async function POST() {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botUsername = await resolveBotUsername();
    if (!botUsername) {
      return NextResponse.json(
        { error: 'Telegram botu henüz yapılandırılmamış. Lütfen yöneticinizle iletişime geçin.' },
        { status: 409 }
      );
    }

    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS).toISOString();

    const admin = createAdminClient();
    const { error } = await admin.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        telegram_link_token: token,
        telegram_link_token_expires_at: expiresAt,
      },
      { onConflict: 'id' }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      deepLink: buildBotDeepLink(botUsername, token),
      botUsername,
      expiresAt,
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}

/** Unlinks the caller's Telegram account. */
export async function DELETE() {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({
        telegram_chat_id: null,
        telegram_link_token: null,
        telegram_link_token_expires_at: null,
      })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
