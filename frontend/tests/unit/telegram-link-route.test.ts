import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST, DELETE } from '@/app/api/telegram/link/route';

const { createClientMock, createAdminClientMock, resolveBotUsernameMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  resolveBotUsernameMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }));
vi.mock('@/lib/server/telegram', () => ({
  resolveBotUsername: resolveBotUsernameMock,
  buildBotDeepLink: (username: string, token: string) => `https://t.me/${username}?start=${token}`,
}));

function mockAuth(user: { id: string; email?: string } | null) {
  createClientMock.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
  });
}

const linkRequest = () =>
  new Request('http://localhost/api/telegram/link', { method: 'POST' });

describe('POST /api/telegram/link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth(null);
    const response = await POST(linkRequest());
    expect(response.status).toBe(401);
  });

  it('returns 409 when the bot is not configured', async () => {
    mockAuth({ id: 'user-1', email: 'ada@example.com' });
    resolveBotUsernameMock.mockResolvedValue(null);

    const response = await POST(linkRequest());
    expect(response.status).toBe(409);
  });

  it('stores a token and returns a deep link', async () => {
    mockAuth({ id: 'user-1', email: 'ada@example.com' });
    resolveBotUsernameMock.mockResolvedValue('TaskFlowBot');
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ upsert: upsertMock })) });

    const response = await POST(linkRequest());
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.botUsername).toBe('TaskFlowBot');
    expect(json.deepLink).toMatch(/^https:\/\/t\.me\/TaskFlowBot\?start=.+/);
    expect(json.expiresAt).toBeTruthy();

    // The generated token must be persisted on the profile.
    const upsertArg = upsertMock.mock.calls[0][0];
    expect(upsertArg.id).toBe('user-1');
    expect(upsertArg.telegram_link_token).toEqual(expect.any(String));
    expect(json.deepLink).toContain(upsertArg.telegram_link_token);
  });
});

describe('DELETE /api/telegram/link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the telegram chat id', async () => {
    mockAuth({ id: 'user-1', email: 'ada@example.com' });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    createAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ update: updateMock })) });

    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ telegram_chat_id: null, telegram_link_token: null })
    );
  });
});
