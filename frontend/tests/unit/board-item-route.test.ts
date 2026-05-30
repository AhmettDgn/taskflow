import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/teams/[teamId]/boards/[boardId]/items/route';

const { createClientMock, createAdminClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }));

function mockAuthedUser() {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'member@example.com', user_metadata: {} } },
        error: null,
      }),
    },
  });
}

function membershipQuery(role: string | null) {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: role ? { role } : null }),
  };
  query.eq.mockReturnValue(query);
  return query;
}

const itemRequest = (body: unknown) =>
  new Request('http://localhost/api/teams/team-1/boards/board-1/items', {
    method: 'POST',
    body: JSON.stringify(body),
  });
const itemParams = { params: { teamId: 'team-1', boardId: 'board-1' } };

describe('POST /api/teams/[teamId]/boards/[boardId]/items', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when the caller is not a team member', async () => {
    mockAuthedUser();
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(membershipQuery(null)) })),
    });

    const response = await POST(itemRequest({ type: 'link', value: 'https://x.dev' }), itemParams);
    expect(response.status).toBe(403);
  });

  it('lets a regular member add an item', async () => {
    mockAuthedUser();

    const boardLookup = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'board-1' } }),
    };
    boardLookup.eq.mockReturnValue(boardLookup);

    const positionQuery = {
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    positionQuery.eq.mockReturnValue(positionQuery);
    positionQuery.order.mockReturnValue(positionQuery);
    positionQuery.limit.mockReturnValue(positionQuery);

    const createdItem = {
      id: 'item-1',
      board_id: 'board-1',
      type: 'link',
      label: 'Figma',
      value: 'https://x.dev',
      position: 0,
    };
    const insertQuery = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: createdItem, error: null }),
      }),
    };

    let itemsCall = 0;
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnValue(membershipQuery('member')) };
        }
        if (table === 'boards') {
          return { select: vi.fn().mockReturnValue(boardLookup) };
        }
        if (table === 'board_items') {
          itemsCall += 1;
          if (itemsCall === 1) return { select: vi.fn().mockReturnValue(positionQuery) };
          return { insert: vi.fn().mockReturnValue(insertQuery) };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await POST(
      itemRequest({ type: 'link', label: 'Figma', value: 'https://x.dev' }),
      itemParams
    );
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.item).toEqual(createdItem);
  });
});
