import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/teams/[teamId]/boards/route';

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
        data: { user: { id: 'user-1', email: 'admin@example.com', user_metadata: {} } },
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

const boardRequest = (body: unknown) =>
  new Request('http://localhost/api/teams/team-1/boards', {
    method: 'POST',
    body: JSON.stringify(body),
  });
const boardParams = { params: { teamId: 'team-1' } };

describe('POST /api/teams/[teamId]/boards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    createClientMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const response = await POST(boardRequest({ name: 'Linkler' }), boardParams);
    expect(response.status).toBe(401);
  });

  it('returns 403 when the member is not an admin', async () => {
    mockAuthedUser();
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(membershipQuery('member')) })),
    });

    const response = await POST(boardRequest({ name: 'Linkler' }), boardParams);
    expect(response.status).toBe(403);
  });

  it('creates a board at the next position for an admin', async () => {
    mockAuthedUser();

    const positionQuery = {
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { position: 2 } }),
    };
    positionQuery.eq.mockReturnValue(positionQuery);
    positionQuery.order.mockReturnValue(positionQuery);
    positionQuery.limit.mockReturnValue(positionQuery);

    const createdBoard = {
      id: 'board-1',
      team_id: 'team-1',
      name: 'Linkler',
      position: 3,
      board_items: [],
    };
    const insertQuery = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: createdBoard, error: null }),
      }),
    };

    let boardsCall = 0;
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnValue(membershipQuery('admin')) };
        }
        if (table === 'boards') {
          boardsCall += 1;
          if (boardsCall === 1) return { select: vi.fn().mockReturnValue(positionQuery) };
          return { insert: vi.fn().mockReturnValue(insertQuery) };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await POST(boardRequest({ name: 'Linkler' }), boardParams);
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.board).toEqual(createdBoard);
  });
});
