import { getPublicRedirectUrl } from '@/lib/public-origin';
import { formatDate } from '@/lib/utils';
import type {
  AssignmentNotificationWarning,
  BoardItem,
  Profile,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  on_hold: 'On Hold',
};

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
    `Durum: ${STATUS_LABELS[task.status]}`,
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
  const botToken = getTelegramBotToken();
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
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
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
  const botToken = getTelegramBotToken();
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
