import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicRedirectUrl } from '@/lib/public-origin';
import {
  answerCallbackQuery,
  resolveTelegramBotToken,
  sendTelegramMessage,
  type TelegramReplyMarkup,
} from '@/lib/server/telegram';
import type { TaskStatus } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Minimal Telegram update shapes (only the fields we use)
// ---------------------------------------------------------------------------
interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: TgUser;
  text?: string;
  reply_to_message?: { text?: string };
}

interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TelegramUpdate {
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export interface TelegramContext {
  headers: Headers;
  requestUrl: string;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  on_hold: 'On Hold',
};

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done', 'on_hold'];

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}


// Matches the hidden marker embedded in the force-reply prompt: [#<teamId>]
const TEAM_MARKER = /\[#([0-9a-fA-F-]{36})\]/;

// ---------------------------------------------------------------------------
// Low-level send helpers
// ---------------------------------------------------------------------------
async function sendMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
  parseMode?: 'HTML' | 'MarkdownV2'
) {
  const botToken = await resolveTelegramBotToken();
  if (!botToken) return;
  try {
    await sendTelegramMessage({ chatId: String(chatId), text, botToken, replyMarkup, parseMode });
  } catch {
    // Best-effort; never throw out of the webhook handler.
  }
}

// Escape user-provided text for Telegram HTML parse mode.
function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Telegram only renders https links cleanly; behind nginx the public origin can
// resolve to http (proxy reports x-forwarded-proto=http), so upgrade real hosts.
function toHttpsUrl(url: string) {
  return url.replace(/^http:\/\/(?!localhost|127\.0\.0\.1)/i, 'https://');
}

function statusKeyboard(taskId: string): TelegramReplyMarkup {
  return {
    inline_keyboard: [
      STATUS_ORDER.slice(0, 2).map((status) => ({
        text: getStatusLabel(status),
        callback_data: `s:${taskId}:${status}`,
      })),
      STATUS_ORDER.slice(2).map((status) => ({
        text: getStatusLabel(status),
        callback_data: `s:${taskId}:${status}`,
      })),
    ],
  };
}

// ---------------------------------------------------------------------------
// User resolution + membership
// ---------------------------------------------------------------------------
interface ResolvedUser {
  id: string;
  full_name: string | null;
  email: string;
}

async function resolveTelegramUser(
  admin: SupabaseClient,
  chatId: number
): Promise<ResolvedUser | null> {
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('telegram_chat_id', String(chatId))
    .maybeSingle();

  return (data as ResolvedUser | null) ?? null;
}

function linkSuccessMessage(name: string) {
  return [
    `✅ Merhaba ${name}, TaskFlow hesabın bu Telegram'a bağlandı.`,
    '',
    'Artık görev atamalarında ve pano güncellemelerinde bildirim alacaksın.',
    'Komutlar için /yardim yazabilirsin.',
  ].join('\n');
}

/**
 * Links the Telegram chat to the TaskFlow account that generated `token` via the
 * profile "Connect" button. The token is single-use and time-limited; once it
 * matches an unexpired profile we store the chat id and clear the token.
 */
async function linkAccountByToken(admin: SupabaseClient, chatId: number, token: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('telegram_link_token', token)
    .gt('telegram_link_token_expires_at', new Date().toISOString())
    .maybeSingle();

  const profile = data as ResolvedUser | null;
  if (!profile) {
    await sendMessage(
      chatId,
      [
        'Bağlantı isteği geçersiz veya süresi dolmuş.',
        '',
        'TaskFlow → Profil sayfasından "Telegram\'a Bağlan" butonuna tekrar tıklayın.',
      ].join('\n')
    );
    return;
  }

  // A chat id must map to a single account — detach it from any other profile first.
  await admin
    .from('profiles')
    .update({ telegram_chat_id: null })
    .eq('telegram_chat_id', String(chatId))
    .neq('id', profile.id);

  const { error } = await admin
    .from('profiles')
    .update({
      telegram_chat_id: String(chatId),
      telegram_link_token: null,
      telegram_link_token_expires_at: null,
    })
    .eq('id', profile.id);

  if (error) {
    await sendMessage(chatId, 'Bağlantı kaydedilemedi, lütfen tekrar deneyin.');
    return;
  }

  await sendMessage(chatId, linkSuccessMessage(profile.full_name?.trim() || profile.email));
}

async function isTeamMember(admin: SupabaseClient, teamId: string, userId: string) {
  const { data } = await admin
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

function notLinkedMessage(chatId: number) {
  return [
    'TaskFlow hesabınız bu Telegram ile bağlı değil.',
    '',
    'TaskFlow → Profil sayfasına gidip "Telegram\'a Bağlan" butonuna tıklayın;',
    'açılan bağlantıdan Start\'a basınca hesabınız otomatik bağlanır.',
    '',
    `Alternatif: Chat ID'nizi (${chatId}) profilde "Gelişmiş" alanına elle kaydedebilirsiniz.`,
  ].join('\n');
}

function helpMessage() {
  return [
    'TaskFlow botuna hoş geldiniz! Komutlar:',
    '',
    '/ekipler — ekiplerinizi ve görevlerini görün',
    '/gorevlerim — size atanan görevler',
    '/yardim — bu mesaj',
    '',
    'Görevlerin altındaki butonlarla durumu değiştirebilir (To Do / In Progress / Done / On Hold), ekip menüsünden yeni görev ekleyebilirsiniz.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Message (command) handling
// ---------------------------------------------------------------------------
async function handleMessage(admin: SupabaseClient, message: TgMessage, ctx: TelegramContext) {
  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();
  const parts = text.split(/\s+/);
  const command = parts[0]?.toLowerCase();

  // Deep-link account linking: tapping "Connect" in TaskFlow opens
  // https://t.me/<bot>?start=<token>, which Telegram delivers as "/start <token>".
  // This must run before the linked-user check, since the chat isn't linked yet.
  if (command === '/start' && parts[1]) {
    await linkAccountByToken(admin, chatId, parts[1]);
    return;
  }

  const user = await resolveTelegramUser(admin, chatId);
  if (!user) {
    await sendMessage(chatId, notLinkedMessage(chatId));
    return;
  }

  // New-task title: a reply to our force-reply prompt carrying the [#teamId] marker.
  const replyText = message.reply_to_message?.text;
  if (replyText) {
    const teamId = replyText.match(TEAM_MARKER)?.[1];
    if (teamId) {
      await createTaskFromReply(admin, { chatId, user, teamId, title: text });
      return;
    }
  }

  switch (command) {
    case '/start':
    case '/yardim':
    case '/help':
      await sendMessage(chatId, helpMessage());
      return;
    case '/ekipler':
      await sendTeamList(admin, chatId, user);
      return;
    case '/gorevlerim':
      await sendMyTasks(admin, chatId, user, ctx);
      return;
    default:
      await sendMessage(chatId, 'Anlaşılmadı. Komutlar için /yardim yazın.');
  }
}

async function sendTeamList(admin: SupabaseClient, chatId: number, user: ResolvedUser) {
  const { data } = await admin
    .from('team_members')
    .select('teams(id, name)')
    .eq('user_id', user.id);

  const teams = (data ?? [])
    .map((row) => row.teams as unknown as { id: string; name: string } | null)
    .filter((team): team is { id: string; name: string } => !!team);

  if (teams.length === 0) {
    await sendMessage(chatId, 'Henüz bir ekibe üye değilsiniz.');
    return;
  }

  await sendMessage(chatId, 'Ekipleriniz:', {
    inline_keyboard: teams.map((team) => [{ text: team.name, callback_data: `t:${team.id}` }]),
  });
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  team_id: string;
}

const MAX_DESCRIPTION_LENGTH = 500;

// Builds an HTML-formatted task message: the title is a clickable link and the
// description (if any) is included. Caller must send with parseMode: 'HTML'.
function buildTaskText(task: TaskRow, teamName: string, taskUrl: string) {
  const lines = [
    `📋 <a href="${toHttpsUrl(taskUrl)}">${escapeHtml(task.title)}</a>`,
    `Ekip: ${escapeHtml(teamName)}`,
    `Durum: ${getStatusLabel(task.status)}`,
  ];

  const description = task.description?.trim();
  if (description) {
    const truncated =
      description.length > MAX_DESCRIPTION_LENGTH
        ? `${description.slice(0, MAX_DESCRIPTION_LENGTH)}…`
        : description;
    lines.push(`Açıklama: ${escapeHtml(truncated)}`);
  }

  return lines.join('\n');
}

async function sendMyTasks(
  admin: SupabaseClient,
  chatId: number,
  user: ResolvedUser,
  ctx: TelegramContext
) {
  const { data } = await admin
    .from('task_assignees')
    .select('tasks(id, title, description, status, team_id, teams(name))')
    .eq('user_id', user.id);

  const tasks = (data ?? [])
    .map((row) => row.tasks as unknown as (TaskRow & { teams?: { name: string } }) | null)
    .filter((task): task is TaskRow & { teams?: { name: string } } => !!task);

  if (tasks.length === 0) {
    await sendMessage(chatId, 'Size atanmış görev yok.');
    return;
  }

  await sendMessage(chatId, `Size atanan ${tasks.length} görev:`);
  for (const task of tasks) {
    const taskUrl = getPublicRedirectUrl(`/teams/${task.team_id}/tasks/${task.id}`, ctx);
    await sendMessage(
      chatId,
      buildTaskText(task, task.teams?.name ?? 'Ekip', taskUrl),
      statusKeyboard(task.id),
      'HTML'
    );
  }
}

async function sendTeamTasks(
  admin: SupabaseClient,
  chatId: number,
  user: ResolvedUser,
  teamId: string,
  ctx: TelegramContext
) {
  if (!(await isTeamMember(admin, teamId, user.id))) {
    await sendMessage(chatId, 'Bu ekibe erişiminiz yok.');
    return;
  }

  const { data: team } = await admin.from('teams').select('name').eq('id', teamId).maybeSingle();
  const teamName = (team as { name: string } | null)?.name ?? 'Ekip';

  const { data } = await admin
    .from('tasks')
    .select('id, title, description, status, team_id')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  const tasks = (data ?? []) as TaskRow[];

  await sendMessage(chatId, `"${teamName}" görevleri (${tasks.length}):`, {
    inline_keyboard: [[{ text: '➕ Görev Ekle', callback_data: `n:${teamId}` }]],
  });

  for (const task of tasks) {
    const taskUrl = getPublicRedirectUrl(`/teams/${task.team_id}/tasks/${task.id}`, ctx);
    await sendMessage(chatId, buildTaskText(task, teamName, taskUrl), statusKeyboard(task.id), 'HTML');
  }
}

// ---------------------------------------------------------------------------
// Callback (inline button) handling
// ---------------------------------------------------------------------------
async function handleCallback(admin: SupabaseClient, query: TgCallbackQuery, ctx: TelegramContext) {
  const chatId = query.message?.chat.id ?? query.from.id;
  const data = query.data ?? '';

  const user = await resolveTelegramUser(admin, query.from.id);
  if (!user) {
    await answerCallbackQuery(query.id, 'Hesabınız bağlı değil');
    await sendMessage(chatId, notLinkedMessage(query.from.id));
    return;
  }

  if (data.startsWith('t:')) {
    await answerCallbackQuery(query.id);
    await sendTeamTasks(admin, chatId, user, data.slice(2), ctx);
    return;
  }

  if (data.startsWith('n:')) {
    const teamId = data.slice(2);
    await answerCallbackQuery(query.id);
    if (!(await isTeamMember(admin, teamId, user.id))) {
      await sendMessage(chatId, 'Bu ekibe erişiminiz yok.');
      return;
    }
    await sendMessage(
      chatId,
      `Yeni görevin başlığını bu mesajı yanıtlayarak yazın.\n[#${teamId}]`,
      { force_reply: true }
    );
    return;
  }

  if (data.startsWith('s:')) {
    const [, taskId, status] = data.split(':');
    await changeTaskStatus(admin, { query, chatId, user, taskId, status: status as TaskStatus });
    return;
  }

  await answerCallbackQuery(query.id);
}

async function changeTaskStatus(
  admin: SupabaseClient,
  {
    query,
    chatId,
    user,
    taskId,
    status,
  }: {
    query: TgCallbackQuery;
    chatId: number;
    user: ResolvedUser;
    taskId: string;
    status: TaskStatus;
  }
) {
  if (!STATUS_ORDER.includes(status)) {
    await answerCallbackQuery(query.id, 'Geçersiz durum');
    return;
  }

  const { data: task } = await admin
    .from('tasks')
    .select('id, title, team_id')
    .eq('id', taskId)
    .maybeSingle();

  if (!task) {
    await answerCallbackQuery(query.id, 'Görev bulunamadı');
    return;
  }

  const taskRow = task as { id: string; title: string; team_id: string };
  if (!(await isTeamMember(admin, taskRow.team_id, user.id))) {
    await answerCallbackQuery(query.id, 'Yetkiniz yok');
    return;
  }

  const { error } = await admin
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) {
    await answerCallbackQuery(query.id, 'Güncellenemedi');
    return;
  }

  await answerCallbackQuery(query.id, `Durum: ${getStatusLabel(status)}`);
  await sendMessage(chatId, `✅ "${taskRow.title}" → ${getStatusLabel(status)}`);
}

async function createTaskFromReply(
  admin: SupabaseClient,
  {
    chatId,
    user,
    teamId,
    title,
  }: { chatId: number; user: ResolvedUser; teamId: string; title: string }
) {
  const trimmed = title.trim();
  if (!trimmed) {
    await sendMessage(chatId, 'Görev başlığı boş olamaz.');
    return;
  }

  if (!(await isTeamMember(admin, teamId, user.id))) {
    await sendMessage(chatId, 'Bu ekibe erişiminiz yok.');
    return;
  }

  const { data: task, error } = await admin
    .from('tasks')
    .insert({
      team_id: teamId,
      title: trimmed.slice(0, 200),
      status: 'todo',
      priority: 'medium',
      created_by: user.id,
    })
    .select('id, title')
    .single();

  if (error || !task) {
    await sendMessage(chatId, 'Görev oluşturulamadı.');
    return;
  }

  const created = task as { id: string; title: string };
  await sendMessage(chatId, `✅ Görev eklendi: "${created.title}"`, statusKeyboard(created.id));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export async function handleTelegramUpdate(update: TelegramUpdate, ctx: TelegramContext) {
  const admin = createAdminClient();

  if (update.callback_query) {
    await handleCallback(admin, update.callback_query, ctx);
    return;
  }

  if (update.message?.text) {
    await handleMessage(admin, update.message, ctx);
  }
}
