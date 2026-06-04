import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/telegram/config/route';

const {
  createClientMock,
  createAdminClientMock,
  isTelegramAdminMock,
  telegramGetMeMock,
  telegramSetWebhookMock,
  telegramGetWebhookInfoMock,
  resolveBotUsernameMock,
  resolveTelegramBotTokenMock,
  invalidateCacheMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  isTelegramAdminMock: vi.fn(),
  telegramGetMeMock: vi.fn(),
  telegramSetWebhookMock: vi.fn(),
  telegramGetWebhookInfoMock: vi.fn(),
  resolveBotUsernameMock: vi.fn(),
  resolveTelegramBotTokenMock: vi.fn(),
  invalidateCacheMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }));
vi.mock('@/lib/server/telegram-admin', () => ({ isTelegramAdmin: isTelegramAdminMock }));
vi.mock('@/lib/public-origin', () => ({
  getPublicRedirectUrl: () => 'https://app.example.com/api/telegram/webhook',
}));
vi.mock('@/lib/server/telegram', () => ({
  telegramGetMe: telegramGetMeMock,
  telegramSetWebhook: telegramSetWebhookMock,
  telegramGetWebhookInfo: telegramGetWebhookInfoMock,
  resolveBotUsername: resolveBotUsernameMock,
  resolveTelegramBotToken: resolveTelegramBotTokenMock,
  invalidateTelegramSettingsCache: invalidateCacheMock,
}));

function mockAuth(user: { id: string; email?: string } | null) {
  createClientMock.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
  });
}

const postRequest = (body: unknown) =>
  new Request('https://app.example.com/api/telegram/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const getRequest = () => new Request('https://app.example.com/api/telegram/config');

describe('GET /api/telegram/config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports isAdmin false for non-admins without leaking config', async () => {
    mockAuth({ id: 'user-1', email: 'member@example.com' });
    isTelegramAdminMock.mockReturnValue(false);

    const response = await GET(getRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ isAdmin: false });
  });

  it('returns status for admins', async () => {
    mockAuth({ id: 'user-1', email: 'owner@example.com' });
    isTelegramAdminMock.mockReturnValue(true);
    resolveTelegramBotTokenMock.mockResolvedValue('bot-token');
    resolveBotUsernameMock.mockResolvedValue('TaskFlowBot');
    telegramGetWebhookInfoMock.mockResolvedValue({
      url: 'https://app.example.com/api/telegram/webhook',
    });

    const response = await GET(getRequest());
    const json = await response.json();
    expect(json.isAdmin).toBe(true);
    expect(json.configured).toBe(true);
    expect(json.botUsername).toBe('TaskFlowBot');
    expect(json.webhookRegistered).toBe(true);
  });
});

describe('POST /api/telegram/config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admins', async () => {
    mockAuth({ id: 'user-1', email: 'member@example.com' });
    isTelegramAdminMock.mockReturnValue(false);

    const response = await POST(postRequest({ botToken: 'x' }));
    expect(response.status).toBe(403);
  });

  it('returns 400 for an invalid bot token', async () => {
    mockAuth({ id: 'user-1', email: 'owner@example.com' });
    isTelegramAdminMock.mockReturnValue(true);
    telegramGetMeMock.mockResolvedValue(null);

    const response = await POST(postRequest({ botToken: 'bad' }));
    expect(response.status).toBe(400);
  });

  it('validates, registers the webhook, and persists settings', async () => {
    mockAuth({ id: 'user-1', email: 'owner@example.com' });
    isTelegramAdminMock.mockReturnValue(true);
    telegramGetMeMock.mockResolvedValue({ id: 1, username: 'TaskFlowBot' });
    telegramSetWebhookMock.mockResolvedValue({ ok: true });

    const settingsQuery = {
      select: vi.fn(() => settingsQuery),
      eq: vi.fn(() => settingsQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    createAdminClientMock.mockReturnValue({ from: vi.fn(() => settingsQuery) });

    const response = await POST(postRequest({ botToken: '123:ABC' }));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.configured).toBe(true);
    expect(json.botUsername).toBe('TaskFlowBot');
    expect(json.webhookRegistered).toBe(true);

    expect(telegramSetWebhookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        botToken: '123:ABC',
        url: 'https://app.example.com/api/telegram/webhook',
      })
    );
    expect(settingsQuery.upsert).toHaveBeenCalled();
    expect(invalidateCacheMock).toHaveBeenCalled();
  });

  it('returns 400 when setWebhook fails', async () => {
    mockAuth({ id: 'user-1', email: 'owner@example.com' });
    isTelegramAdminMock.mockReturnValue(true);
    telegramGetMeMock.mockResolvedValue({ id: 1, username: 'TaskFlowBot' });
    telegramSetWebhookMock.mockResolvedValue({ ok: false, description: 'bad url' });

    const settingsQuery = {
      select: vi.fn(() => settingsQuery),
      eq: vi.fn(() => settingsQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    createAdminClientMock.mockReturnValue({ from: vi.fn(() => settingsQuery) });

    const response = await POST(postRequest({ botToken: '123:ABC' }));
    expect(response.status).toBe(400);
    expect(settingsQuery.upsert).not.toHaveBeenCalled();
  });
});
