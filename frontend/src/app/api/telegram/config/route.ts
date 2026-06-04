import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicRedirectUrl } from '@/lib/public-origin';
import { isTelegramAdmin } from '@/lib/server/telegram-admin';
import {
  invalidateTelegramSettingsCache,
  resolveBotUsername,
  resolveTelegramBotToken,
  telegramGetMe,
  telegramGetWebhookInfo,
  telegramSetWebhook,
} from '@/lib/server/telegram';

interface AuthedAdmin {
  email: string | null;
  isAdmin: boolean;
}

async function getAuthedAdmin(): Promise<{ user: { email?: string | null } | null } & AuthedAdmin> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return {
    user,
    email: user?.email ?? null,
    isAdmin: isTelegramAdmin(user?.email),
  };
}

function buildWebhookUrl(request: Request) {
  return getPublicRedirectUrl('/api/telegram/webhook', {
    headers: request.headers,
    requestUrl: request.url,
  });
}

/**
 * Reports the shared-bot configuration status to the admin setup card.
 * Never returns the bot token or webhook secret.
 */
export async function GET(request: Request) {
  try {
    const { user, isAdmin } = await getAuthedAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ isAdmin: false });
    }

    const webhookUrl = buildWebhookUrl(request);
    const botToken = await resolveTelegramBotToken();
    const botUsername = botToken ? await resolveBotUsername() : null;

    let webhookRegistered = false;
    if (botToken) {
      const info = await telegramGetWebhookInfo(botToken);
      webhookRegistered = !!info?.url && info.url === webhookUrl;
    }

    return NextResponse.json({
      isAdmin: true,
      configured: !!botToken,
      botUsername,
      webhookRegistered,
      webhookUrl,
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}

/**
 * Saves a bot token, validates it via getMe, and registers the webhook with a
 * generated secret. Admin-only.
 */
export async function POST(request: Request) {
  try {
    const { user, isAdmin } = await getAuthedAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Bu islem icin yetkiniz yok' }, { status: 403 });
    }

    const { botToken } = await request.json();
    const trimmedToken = String(botToken ?? '').trim();
    if (!trimmedToken) {
      return NextResponse.json({ error: 'Bot token gerekli' }, { status: 400 });
    }

    const me = await telegramGetMe(trimmedToken);
    if (!me?.username) {
      return NextResponse.json(
        { error: 'Bot token gecersiz. BotFather token bilgisini kontrol edin.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('app_telegram_settings')
      .select('webhook_secret')
      .eq('id', 'default')
      .maybeSingle();

    const webhookSecret =
      (existing as { webhook_secret: string | null } | null)?.webhook_secret?.trim() ||
      randomBytes(32).toString('hex');

    const webhookUrl = buildWebhookUrl(request);
    const result = await telegramSetWebhook({
      botToken: trimmedToken,
      url: webhookUrl,
      secretToken: webhookSecret,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: `Webhook kaydedilemedi: ${result.description ?? 'bilinmeyen hata'}` },
        { status: 400 }
      );
    }

    const { error: upsertError } = await admin.from('app_telegram_settings').upsert(
      {
        id: 'default',
        bot_token: trimmedToken,
        bot_username: me.username,
        webhook_secret: webhookSecret,
        webhook_registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    invalidateTelegramSettingsCache();

    return NextResponse.json({
      isAdmin: true,
      configured: true,
      botUsername: me.username,
      webhookRegistered: true,
      webhookUrl,
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
