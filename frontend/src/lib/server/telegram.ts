import { getPublicRedirectUrl } from '@/lib/public-origin';
import { formatDate } from '@/lib/utils';
import type {
  AssignmentNotificationWarning,
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

async function sendTelegramMessage({
  chatId,
  text,
  botToken,
}: {
  chatId: string;
  text: string;
  botToken: string;
}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
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
