import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicRedirectUrl } from '@/lib/public-origin';
import {
  answerCallbackQuery,
  resolveTelegramBotToken,
  sendTelegramMessage,
  editTelegramMessage,
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

async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
  parseMode?: 'HTML' | 'MarkdownV2'
) {
  const botToken = await resolveTelegramBotToken();
  if (!botToken) return;
  try {
    await editTelegramMessage({
      chatId: String(chatId),
      messageId,
      text,
      botToken,
      replyMarkup,
      parseMode,
    });
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
async function handleMessage(admin: SupabaseClient, message: TgMessage) {
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
      await sendMyTasksList(admin, chatId, user, undefined);
      return;
    default:
      await sendMessage(chatId, 'Anlaşılmadı. Komutlar için /yardim yazın.');
  }
}

async function sendTeamList(admin: SupabaseClient, chatId: number, user: ResolvedUser, messageId?: number) {
  const { data } = await admin
    .from('team_members')
    .select('teams(id, name)')
    .eq('user_id', user.id);

  const teams = (data ?? [])
    .map((row) => row.teams as unknown as { id: string; name: string } | null)
    .filter((team): team is { id: string; name: string } => !!team);

  if (teams.length === 0) {
    const text = 'Henüz bir ekibe üye değilsiniz.';
    if (messageId) {
      await editMessage(chatId, messageId, text);
    } else {
      await sendMessage(chatId, text);
    }
    return;
  }

  const text = 'Ekipleriniz:';
  const replyMarkup = {
    inline_keyboard: teams.map((team) => [{ text: team.name, callback_data: `t:${team.id}` }]),
  };

  if (messageId) {
    await editMessage(chatId, messageId, text, replyMarkup);
  } else {
    await sendMessage(chatId, text, replyMarkup);
  }
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  team_id: string;
}



async function sendMyTasksList(
  admin: SupabaseClient,
  chatId: number,
  user: ResolvedUser,
  messageId?: number
) {
  const { data } = await admin
    .from('task_assignees')
    .select('tasks(id, title, description, status, team_id, teams(name))')
    .eq('user_id', user.id);

  const tasks = (data ?? [])
    .map((row) => row.tasks as unknown as (TaskRow & { teams?: { name: string } }) | null)
    .filter((task): task is TaskRow & { teams?: { name: string } } => !!task);

  if (tasks.length === 0) {
    const text = 'Size atanmış görev yok.';
    if (messageId) {
      await editMessage(chatId, messageId, text);
    } else {
      await sendMessage(chatId, text);
    }
    return;
  }

  const lines = [
    `📋 <b>Görevlerim (${tasks.length})</b>`,
    'Detaylar ve durum güncellemesi için görev numarasının altındaki butona tıklayın:',
    '',
  ];

  tasks.forEach((task, idx) => {
    lines.push(
      `${idx + 1}. <b>${escapeHtml(task.title)}</b>`,
      `   Durum: <code>${escapeHtml(getStatusLabel(task.status))}</code> | Ekip: <i>${escapeHtml(task.teams?.name ?? 'Ekip')}</i>`,
      ''
    );
  });

  const inline_keyboard: { text: string; callback_data: string }[][] = [];
  let currentRow: { text: string; callback_data: string }[] = [];
  tasks.forEach((task, idx) => {
    currentRow.push({
      text: `${idx + 1}`,
      callback_data: `view:${task.id}:my`,
    });
    if (currentRow.length === 5) {
      inline_keyboard.push(currentRow);
      currentRow = [];
    }
  });
  if (currentRow.length > 0) {
    inline_keyboard.push(currentRow);
  }

  const text = lines.join('\n');
  if (messageId) {
    await editMessage(chatId, messageId, text, { inline_keyboard }, 'HTML');
  } else {
    await sendMessage(chatId, text, { inline_keyboard }, 'HTML');
  }
}

async function sendTaskDetail(
  admin: SupabaseClient,
  chatId: number,
  user: ResolvedUser,
  taskId: string,
  messageId: number,
  backTo: string,
  ctx?: TelegramContext
) {
  const { data: task } = await admin
    .from('tasks')
    .select('id, title, description, status, team_id, teams(name)')
    .eq('id', taskId)
    .maybeSingle();

  if (!task) {
    await sendMessage(chatId, 'Görev bulunamadı.');
    return;
  }

  const taskRow = task as unknown as TaskRow & { teams?: { name: string } | null };

  if (!(await isTeamMember(admin, taskRow.team_id, user.id))) {
    await sendMessage(chatId, 'Bu ekibe erişiminiz yok.');
    return;
  }

  const taskUrl = ctx ? getPublicRedirectUrl(`/teams/${taskRow.team_id}/tasks/${taskRow.id}`, ctx) : '';

  const lines = [
    `📌 <b>Görev Detayları</b>`,
    ``,
    `<b>Başlık:</b> ${escapeHtml(taskRow.title)}`,
    `<b>Ekip:</b> ${escapeHtml(taskRow.teams?.name ?? 'Ekip')}`,
    `<b>Durum:</b> <code>${escapeHtml(getStatusLabel(taskRow.status))}</code>`,
  ];

  if (taskRow.description?.trim()) {
    lines.push(`<b>Açıklama:</b>\n<i>${escapeHtml(taskRow.description.trim())}</i>`);
  } else {
    lines.push(`<b>Açıklama:</b> Yok`);
  }

  if (taskUrl) {
    lines.push(
      ``,
      `🔗 <a href="${toHttpsUrl(taskUrl)}">Web Sitesinde İncele</a>`
    );
  }

  const inline_keyboard = [
    [
      { text: '⚙️ Durumu Değiştir', callback_data: `status_menu:${taskId}:${backTo}` }
    ],
    [
      { text: '🔙 Listeye Dön', callback_data: `back:${backTo}` }
    ]
  ];

  await editMessage(chatId, messageId, lines.join('\n'), { inline_keyboard }, 'HTML');
}

async function sendStatusMenu(
  chatId: number,
  taskId: string,
  messageId: number,
  backTo: string
) {
  const lines = [
    `⚙️ <b>Görev Durumunu Seçin</b>`,
    `Görevin yeni durumunu belirlemek için aşağıdaki butonlardan birine tıklayın:`,
  ];

  const inline_keyboard = [
    STATUS_ORDER.slice(0, 2).map((status) => ({
      text: getStatusLabel(status),
      callback_data: `set_status:${taskId}:${status}:${backTo}`,
    })),
    STATUS_ORDER.slice(2).map((status) => ({
      text: getStatusLabel(status),
      callback_data: `set_status:${taskId}:${status}:${backTo}`,
    })),
    [
      { text: '🔙 İptal (Geri Dön)', callback_data: `view:${taskId}:${backTo}` }
    ]
  ];

  await editMessage(chatId, messageId, lines.join('\n'), { inline_keyboard }, 'HTML');
}

async function sendTeamTasksList(
  admin: SupabaseClient,
  chatId: number,
  user: ResolvedUser,
  teamId: string,
  messageId: number
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

  const lines = [
    `👥 <b>"${escapeHtml(teamName)}" Görevleri (${tasks.length})</b>`,
    'Detaylar ve durum güncellemesi için görev numarasının altındaki butona tıklayın:',
    '',
  ];

  if (tasks.length === 0) {
    lines.push('<i>Bu ekipte henüz görev bulunmuyor.</i>', '');
  } else {
    tasks.forEach((task, idx) => {
      lines.push(
        `${idx + 1}. <b>${escapeHtml(task.title)}</b>`,
        `   Durum: <code>${escapeHtml(getStatusLabel(task.status))}</code>`,
        ''
      );
    });
  }

  const inline_keyboard: { text: string; callback_data: string }[][] = [];
  if (tasks.length > 0) {
    let currentRow: { text: string; callback_data: string }[] = [];
    tasks.forEach((task, idx) => {
      currentRow.push({
        text: `${idx + 1}`,
        callback_data: `view:${task.id}:team:${teamId}`,
      });
      if (currentRow.length === 5) {
        inline_keyboard.push(currentRow);
        currentRow = [];
      }
    });
    if (currentRow.length > 0) {
      inline_keyboard.push(currentRow);
    }
  }

  inline_keyboard.push([
    { text: '➕ Görev Ekle', callback_data: `n:${teamId}` }
  ]);
  inline_keyboard.push([
    { text: '🔙 Ekiplere Dön', callback_data: `back:teams` }
  ]);

  const text = lines.join('\n');
  await editMessage(chatId, messageId, text, { inline_keyboard }, 'HTML');
}

// ---------------------------------------------------------------------------
// Callback (inline button) handling
// ---------------------------------------------------------------------------
async function handleCallback(admin: SupabaseClient, query: TgCallbackQuery, ctx: TelegramContext) {
  const chatId = query.message?.chat.id ?? query.from.id;
  const data = query.data ?? '';
  const messageId = query.message?.message_id;

  const user = await resolveTelegramUser(admin, query.from.id);
  if (!user) {
    await answerCallbackQuery(query.id, 'Hesabınız bağlı değil');
    await sendMessage(chatId, notLinkedMessage(query.from.id));
    return;
  }

  if (data.startsWith('t:')) {
    await answerCallbackQuery(query.id);
    if (messageId) {
      await sendTeamTasksList(admin, chatId, user, data.slice(2), messageId);
    }
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

  if (data.startsWith('view:')) {
    await answerCallbackQuery(query.id);
    if (messageId) {
      const parts = data.split(':');
      const taskId = parts[1];
      const backTo = parts.slice(2).join(':') || 'my';
      await sendTaskDetail(admin, chatId, user, taskId, messageId, backTo, ctx);
    }
    return;
  }

  if (data.startsWith('status_menu:')) {
    await answerCallbackQuery(query.id);
    if (messageId) {
      const parts = data.split(':');
      const taskId = parts[1];
      const backTo = parts.slice(2).join(':') || 'my';
      await sendStatusMenu(chatId, taskId, messageId, backTo);
    }
    return;
  }

  if (data.startsWith('set_status:')) {
    const parts = data.split(':');
    const taskId = parts[1];
    const status = parts[2] as TaskStatus;
    const backTo = parts.slice(3).join(':') || 'my';
    await changeTaskStatus(admin, { query, chatId, user, taskId, status, backTo, ctx });
    return;
  }

  if (data.startsWith('back:')) {
    await answerCallbackQuery(query.id);
    if (messageId) {
      const backTo = data.slice(5);
      if (backTo === 'my') {
        await sendMyTasksList(admin, chatId, user, messageId);
      } else if (backTo === 'teams') {
        await sendTeamList(admin, chatId, user, messageId);
      } else if (backTo.startsWith('team:')) {
        const teamId = backTo.slice(5);
        await sendTeamTasksList(admin, chatId, user, teamId, messageId);
      }
    }
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
    backTo,
    ctx,
  }: {
    query: TgCallbackQuery;
    chatId: number;
    user: ResolvedUser;
    taskId: string;
    status: TaskStatus;
    backTo: string;
    ctx?: TelegramContext;
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

  await answerCallbackQuery(query.id, `Durum güncellendi: ${getStatusLabel(status)}`);
  
  if (query.message?.message_id) {
    await sendTaskDetail(admin, chatId, user, taskId, query.message.message_id, backTo, ctx);
  }
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
  // Since it's a new task created from reply, we can show task detail in a new message
  // and offer a link to view it.
  await sendMessage(chatId, `✅ Görev eklendi: "${created.title}"`);
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
    await handleMessage(admin, update.message);
  }
}
