import { NextResponse } from 'next/server';
import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/server/telegram-bot';
import { resolveTelegramWebhookSecret } from '@/lib/server/telegram';

export async function POST(request: Request) {
  // Telegram sends the configured secret in this header (set via setWebhook).
  const secret = await resolveTelegramWebhookSecret();
  if (secret) {
    const provided = request.headers.get('x-telegram-bot-api-secret-token');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleTelegramUpdate(update, {
      headers: request.headers,
      requestUrl: request.url,
    });
  } catch {
    // Always 200 so Telegram does not retry the same update in a loop.
  }

  return NextResponse.json({ ok: true });
}
