import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/telegram/webhook/route';

const { createAdminClientMock, sendTelegramMessageMock, editTelegramMessageMock, answerCallbackQueryMock } = vi.hoisted(
  () => ({
    createAdminClientMock: vi.fn(),
    sendTelegramMessageMock: vi.fn(),
    editTelegramMessageMock: vi.fn(),
    answerCallbackQueryMock: vi.fn(),
  })
);

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }));
vi.mock('@/lib/server/telegram', () => ({
  resolveTelegramBotToken: async () => 'test-token',
  // Mirror the real DB→env fallback so the secret-rejection test keeps working.
  resolveTelegramWebhookSecret: async () => process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '',
  sendTelegramMessage: sendTelegramMessageMock,
  editTelegramMessage: editTelegramMessageMock,
  answerCallbackQuery: answerCallbackQueryMock,
}));

/**
 * A thenable query builder: every chain method returns itself, awaiting it resolves to
 * `awaitResult`, and `.maybeSingle()` / `.single()` resolve to `singleResult` (falling
 * back to `awaitResult`). One object thus serves both `.select().eq().maybeSingle()` and
 * `.update().eq()` (awaited) chains.
 */
function makeQuery(awaitResult: unknown, singleResult?: unknown) {
  const q: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'neq', 'gt', 'order', 'insert', 'update', 'delete', 'limit']) {
    q[method] = vi.fn(() => q);
  }
  q.maybeSingle = vi.fn(async () => singleResult ?? awaitResult);
  q.single = vi.fn(async () => singleResult ?? awaitResult);
  q.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(awaitResult).then(resolve, reject);
  return q;
}

function mockAdmin(tables: Record<string, ReturnType<typeof makeQuery>>) {
  createAdminClientMock.mockReturnValue({
    from: vi.fn((table: string) => {
      const query = tables[table];
      if (!query) throw new Error(`Unexpected table ${table}`);
      return query;
    }),
  });
}

const webhookRequest = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const LINKED_USER = { id: 'user-1', full_name: 'Ada', email: 'ada@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

afterEach(() => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

describe('POST /api/telegram/webhook', () => {
  it('rejects updates with an invalid secret token', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'top-secret';

    const response = await POST(
      webhookRequest({ message: { message_id: 1, chat: { id: 1 }, text: '/start' } })
    );

    expect(response.status).toBe(401);
    expect(sendTelegramMessageMock).not.toHaveBeenCalled();
  });

  it('prompts an unlinked chat with its chat id', async () => {
    mockAdmin({ profiles: makeQuery({ data: null }, { data: null }) });

    const response = await POST(
      webhookRequest({ message: { message_id: 1, chat: { id: 99 }, text: '/start' } })
    );

    expect(response.status).toBe(200);
    expect(sendTelegramMessageMock).toHaveBeenCalledTimes(1);
    const text = sendTelegramMessageMock.mock.calls[0][0].text as string;
    expect(text).toContain('99');
    expect(text).toContain('bağlı değil');
  });

  it('links an account from a /start deep-link token', async () => {
    mockAdmin({
      profiles: makeQuery(
        { error: null },
        { data: { id: 'user-1', full_name: 'Ada', email: 'ada@example.com' } }
      ),
    });

    const response = await POST(
      webhookRequest({ message: { message_id: 1, chat: { id: 7 }, text: '/start tok-abc' } })
    );

    expect(response.status).toBe(200);
    const texts = sendTelegramMessageMock.mock.calls.map((call) => call[0].text as string);
    expect(texts.some((text) => text.includes('bağlandı'))).toBe(true);
  });

  it('rejects an expired or unknown /start token', async () => {
    mockAdmin({ profiles: makeQuery({ error: null }, { data: null }) });

    const response = await POST(
      webhookRequest({ message: { message_id: 1, chat: { id: 7 }, text: '/start bad-token' } })
    );

    expect(response.status).toBe(200);
    const texts = sendTelegramMessageMock.mock.calls.map((call) => call[0].text as string);
    expect(texts.some((text) => text.includes('geçersiz veya süresi dolmuş'))).toBe(true);
  });

  it('lists tasks assigned to a linked user for /gorevlerim', async () => {
    mockAdmin({
      profiles: makeQuery({ data: LINKED_USER }, { data: LINKED_USER }),
      task_assignees: makeQuery({
        data: [
          {
            tasks: {
              id: 'task-1',
              title: 'Landing page',
              status: 'todo',
              team_id: 'team-1',
              teams: { name: 'Core' },
            },
          },
        ],
      }),
    });

    const response = await POST(
      webhookRequest({ message: { message_id: 1, chat: { id: 5 }, text: '/gorevlerim' } })
    );

    expect(response.status).toBe(200);
    const texts = sendTelegramMessageMock.mock.calls.map((call) => call[0].text as string);
    expect(texts.some((text) => text.includes('Landing page'))).toBe(true);
  });

  it('changes task status from a status callback', async () => {
    mockAdmin({
      profiles: makeQuery({ data: LINKED_USER }, { data: LINKED_USER }),
      tasks: makeQuery(
        { error: null },
        { data: { id: 'task-1', title: 'Landing page', status: 'done', team_id: 'team-1', teams: { name: 'Core' } } }
      ),
      team_members: makeQuery({ data: { id: 'm1' } }, { data: { id: 'm1' } }),
    });

    const response = await POST(
      webhookRequest({
        callback_query: {
          id: 'cb-1',
          from: { id: 5 },
          message: { message_id: 2, chat: { id: 5 } },
          data: 'set_status:task-1:done:my',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(answerCallbackQueryMock).toHaveBeenCalled();
    expect(editTelegramMessageMock).toHaveBeenCalledTimes(1);
    const text = editTelegramMessageMock.mock.calls[0][0].text as string;
    expect(text).toContain('Landing page');
    expect(text).toContain('Done');
  });

  it('creates a task from a reply carrying the team marker', async () => {
    const insertQuery = makeQuery({ error: null }, { data: { id: 'task-9', title: 'Yeni iş' } });
    mockAdmin({
      profiles: makeQuery({ data: LINKED_USER }, { data: LINKED_USER }),
      team_members: makeQuery({ data: { id: 'm1' } }, { data: { id: 'm1' } }),
      tasks: insertQuery,
    });

    const response = await POST(
      webhookRequest({
        message: {
          message_id: 3,
          chat: { id: 5 },
          text: 'Yeni iş',
          reply_to_message: {
            text: 'Yeni görevin başlığını bu mesajı yanıtlayarak yazın.\n[#11111111-1111-1111-1111-111111111111]',
          },
        },
      })
    );

    expect(response.status).toBe(200);
    expect(insertQuery.insert).toHaveBeenCalled();
    const texts = sendTelegramMessageMock.mock.calls.map((call) => call[0].text as string);
    expect(texts.some((text) => text.includes('Görev eklendi'))).toBe(true);
  });
});
