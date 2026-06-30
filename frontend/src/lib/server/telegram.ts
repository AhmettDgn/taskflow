import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicRedirectUrl } from '@/lib/public-origin';
import { formatDate } from '@/lib/utils';
import type {
  AssignmentNotificationWarning,
  BoardItem,
  Profile,
  Task,
  TaskPriority,
} from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  on_hold: 'On Hold',
};

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function getEmailLocalPart(email: string | null | undefined) {
  return email?.split('@')[0] ?? 'Kullanici';
}

function getRecipientName(profile: Pick<Profile, 'email' | 'full_name'>) {
  return profile.full_name?.trim() || getEmailLocalPart(profile.email);
}

export function normalizeTelegramChatId(value: unknown) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  return normalized;
}

export function isValidTelegramChatId(value: string | null) {
  if (!value) return true;
  return /^-?\d+$/.test(value);
}

function buildTaskAssignmentMessage({
  task,
  teamName,
  assignerName,
  taskUrl,
}: {
  task: Pick<Task, 'title' | 'status' | 'priority' | 'due_date' | 'id'>;
  teamName: string;
  assignerName: string;
  taskUrl: string;
}) {
  const lines = [
    'Yeni gorev atamasi',
    '',
    `Gorev: ${task.title}`,
    `Ekip: ${teamName}`,
    `Atayan: ${assignerName}`,
    `Durum: ${getStatusLabel(task.status)}`,
    `Oncelik: ${PRIORITY_LABELS[task.priority]}`,
  ];

  if (task.due_date) {
    lines.push(`Vade: ${formatDate(task.due_date)}`);
  }

  lines.push(`Detay: ${taskUrl}`);
  return lines.join('\n');
}

export type TelegramReplyMarkup = Record<string, unknown>;

export function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
}

// ---------------------------------------------------------------------------
// Shared-bot settings resolution (DB → env fallback)
//
// The bot token / webhook secret can be configured at runtime through the UI
// and stored in `app_telegram_settings`. We fall back to env vars so existing
// deployments keep working. A short in-memory cache avoids hitting the DB on
// every send; call `invalidateTelegramSettingsCache()` after a config change.
// ---------------------------------------------------------------------------
export interface TelegramSettings {
  botToken: string | null;
  botUsername: string | null;
  webhookSecret: string | null;
  webhookRegisteredAt: string | null;
}

const SETTINGS_CACHE_TTL_MS = 60_000;
let settingsCache: { value: TelegramSettings; expiresAt: number } | null = null;

export function invalidateTelegramSettingsCache() {
  settingsCache = null;
}

async function loadTelegramSettings(): Promise<TelegramSettings> {
  if (settingsCache && settingsCache.expiresAt > Date.now()) {
    return settingsCache.value;
  }

  let value: TelegramSettings = {
    botToken: null,
    botUsername: null,
    webhookSecret: null,
    webhookRegisteredAt: null,
  };

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('app_telegram_settings')
      .select('bot_token, bot_username, webhook_secret, webhook_registered_at')
      .eq('id', 'default')
      .maybeSingle();

    if (data) {
      const row = data as {
        bot_token: string | null;
        bot_username: string | null;
        webhook_secret: string | null;
        webhook_registered_at: string | null;
      };
      value = {
        botToken: row.bot_token?.trim() || null,
        botUsername: row.bot_username?.trim() || null,
        webhookSecret: row.webhook_secret?.trim() || null,
        webhookRegisteredAt: row.webhook_registered_at,
      };
    }
  } catch {
    // Missing table or service-role key: fall back to env-only settings below.
  }

  settingsCache = { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
  return value;
}

export async function resolveTelegramBotToken(): Promise<string> {
  const settings = await loadTelegramSettings();
  return settings.botToken || getTelegramBotToken();
}

export async function resolveTelegramWebhookSecret(): Promise<string> {
  const settings = await loadTelegramSettings();
  return settings.webhookSecret || (process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '');
}

export async function resolveBotUsername(): Promise<string | null> {
  const settings = await loadTelegramSettings();
  if (settings.botUsername) return settings.botUsername;

  const token = settings.botToken || getTelegramBotToken();
  if (!token) return null;

  const me = await telegramGetMe(token);
  return me?.username ?? null;
}

export function buildBotDeepLink(username: string, token: string) {
  return `https://t.me/${username}?start=${token}`;
}

// ---------------------------------------------------------------------------
// Thin Telegram Bot API wrappers (getMe / setWebhook / getWebhookInfo)
// ---------------------------------------------------------------------------
export interface TelegramBotInfo {
  id: number;
  username?: string;
  first_name?: string;
}

/**
 * Validates a bot token and returns the bot identity. Returns null when the
 * token is rejected or the request fails — callers treat that as "invalid".
 */
export async function telegramGetMe(botToken: string): Promise<TelegramBotInfo | null> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    if (!response.ok) return null;
    const json = await response.json();
    return json?.ok ? (json.result as TelegramBotInfo) : null;
  } catch {
    return null;
  }
}

export async function telegramSetWebhook({
  botToken,
  url,
  secretToken,
}: {
  botToken: string;
  url: string;
  secretToken: string;
}): Promise<{ ok: boolean; description?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: secretToken,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    });
    const json = await response.json().catch(() => null);
    if (json?.ok) return { ok: true };
    return { ok: false, description: json?.description ?? `Telegram API hatasi (${response.status})` };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : 'Webhook kaydedilemedi' };
  }
}

export interface TelegramWebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_message?: string;
}

export async function telegramGetWebhookInfo(botToken: string): Promise<TelegramWebhookInfo | null> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    if (!response.ok) return null;
    const json = await response.json();
    return json?.ok ? (json.result as TelegramWebhookInfo) : null;
  } catch {
    return null;
  }
}

export async function sendTelegramMessage({
  chatId,
  text,
  botToken,
  replyMarkup,
}: {
  chatId: string;
  text: string;
  botToken: string;
  replyMarkup?: TelegramReplyMarkup;
}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!response.ok) {
    let errorMessage = `Telegram API hatasi (${response.status})`;

    try {
      const json = await response.json();
      if (json?.description) {
        errorMessage = String(json.description);
      }
    } catch {
      // Ignore parse failures and use the fallback message.
    }

    throw new Error(errorMessage);
  }
}

/**
 * Acknowledges a callback query so Telegram stops showing the loading spinner on the
 * tapped inline button. Best-effort — failures are swallowed.
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const botToken = await resolveTelegramBotToken();
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      }),
    });
  } catch {
    // Ignore — acknowledging is non-critical.
  }
}

export async function sendTaskAssignmentNotifications({
  recipients,
  task,
  teamName,
  assignerName,
  teamId,
  headers,
  requestUrl,
}: {
  recipients: Profile[];
  task: Pick<Task, 'title' | 'status' | 'priority' | 'due_date' | 'id'>;
  teamName: string;
  assignerName: string;
  teamId: string;
  headers: Headers;
  requestUrl: string;
}): Promise<AssignmentNotificationWarning[]> {
  const botToken = await resolveTelegramBotToken();
  const taskUrl = getPublicRedirectUrl(`/teams/${teamId}/tasks/${task.id}`, {
    headers,
    requestUrl,
  });
  const message = buildTaskAssignmentMessage({
    task,
    teamName,
    assignerName,
    taskUrl,
  });

  const warnings = await Promise.all(
    recipients.map(async (recipient) => {
      const recipientName = getRecipientName(recipient);
      const chatId = normalizeTelegramChatId(recipient.telegram_chat_id);

      if (!chatId) {
        return {
          user_id: recipient.id,
          recipient_name: recipientName,
          reason: 'telegram_not_linked',
          message: `${recipientName} icin Telegram chat ID tanimli degil.`,
        } satisfies AssignmentNotificationWarning;
      }

      if (!botToken) {
        return {
          user_id: recipient.id,
          recipient_name: recipientName,
          reason: 'telegram_send_failed',
          message: `${recipientName} icin Telegram bot ayari eksik oldugu icin mesaj gonderilemedi.`,
        } satisfies AssignmentNotificationWarning;
      }

      try {
        await sendTelegramMessage({ chatId, text: message, botToken });
        return null;
      } catch {
        return {
          user_id: recipient.id,
          recipient_name: recipientName,
          reason: 'telegram_send_failed',
          message: `${recipientName} kullanicisina Telegram mesaji gonderilemedi.`,
        } satisfies AssignmentNotificationWarning;
      }
    })
  );

  return warnings.filter((warning): warning is AssignmentNotificationWarning => warning !== null);
}

const BOARD_ITEM_TYPE_LABELS: Record<BoardItem['type'], string> = {
  link: 'link',
  password: 'şifre',
  note: 'not',
};

function buildBoardItemMessage({
  boardName,
  teamName,
  item,
  actorName,
  boardUrl,
}: {
  boardName: string;
  teamName: string;
  item: Pick<BoardItem, 'type' | 'label' | 'value'>;
  actorName: string;
  boardUrl: string;
}) {
  const typeLabel = BOARD_ITEM_TYPE_LABELS[item.type];
  const lines = [
    'Panoya yeni icerik eklendi',
    '',
    `Ekip: ${teamName}`,
    `Pano: ${boardName}`,
    `Tur: ${typeLabel}`,
    `Ekleyen: ${actorName}`,
  ];

  if (item.label) {
    lines.push(`Etiket: ${item.label}`);
  }

  // Never leak password values into chat history; links/notes are safe to preview.
  if (item.type !== 'password') {
    lines.push(`Icerik: ${item.value}`);
  }

  lines.push(`Pano: ${boardUrl}`);
  return lines.join('\n');
}

/**
 * Notifies every team member (except the actor) who has a linked Telegram chat that a
 * new board item was added. Best-effort: individual send failures are ignored so the
 * caller's request is never blocked by Telegram.
 */
export async function sendBoardItemNotifications({
  recipients,
  boardName,
  teamName,
  item,
  actorName,
  teamId,
  headers,
  requestUrl,
}: {
  recipients: Pick<Profile, 'id' | 'telegram_chat_id'>[];
  boardName: string;
  teamName: string;
  item: Pick<BoardItem, 'type' | 'label' | 'value'>;
  actorName: string;
  teamId: string;
  headers: Headers;
  requestUrl: string;
}) {
  const botToken = await resolveTelegramBotToken();
  if (!botToken) return;

  const boardUrl = getPublicRedirectUrl(`/teams/${teamId}/boards`, { headers, requestUrl });
  const message = buildBoardItemMessage({ boardName, teamName, item, actorName, boardUrl });

  await Promise.all(
    recipients.map(async (recipient) => {
      const chatId = normalizeTelegramChatId(recipient.telegram_chat_id);
      if (!chatId) return;

      try {
        await sendTelegramMessage({ chatId, text: message, botToken });
      } catch {
        // Ignore — board notifications are best-effort.
      }
    })
  );
}
