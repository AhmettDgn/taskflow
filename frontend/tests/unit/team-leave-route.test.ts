import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/teams/[teamId]/leave/route';

const { createClientMock, createAdminClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

function mockAuthedUser(id = 'user-1') {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id, email: 'member@example.com', user_metadata: {} } },
        error: null,
      }),
    },
  });
}

/**
 * Builds an admin-client mock for team_members where the first `select` returns the
 * caller's own membership and the second returns the full roster. Optionally captures
 * the membership delete and the team delete.
 */
function buildAdminMock({
  membership,
  roster,
  onMemberDelete,
  onTeamDelete,
}: {
  membership: { id: string; role: string } | null;
  roster: { id: string; role: string }[];
  onMemberDelete?: () => void;
  onTeamDelete?: () => void;
}) {
  const membershipQuery = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: membership }),
  };
  membershipQuery.eq.mockReturnValue(membershipQuery);

  const rosterQuery = {
    eq: vi.fn().mockResolvedValue({ data: roster, error: null }),
  };

  const memberDeleteQuery = {
    eq: vi.fn().mockImplementation(() => {
      onMemberDelete?.();
      return Promise.resolve({ error: null });
    }),
  };

  const teamDeleteQuery = {
    eq: vi.fn().mockImplementation(() => {
      onTeamDelete?.();
      return Promise.resolve({ error: null });
    }),
  };

  let teamMembersSelectCount = 0;

  return {
    from: vi.fn((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn(() => {
            teamMembersSelectCount += 1;
            return teamMembersSelectCount === 1 ? membershipQuery : rosterQuery;
          }),
          delete: vi.fn(() => memberDeleteQuery),
        };
      }

      if (table === 'teams') {
        return { delete: vi.fn(() => teamDeleteQuery) };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

const teamRequest = () =>
  new Request('http://localhost/api/teams/team-1/leave', { method: 'POST' });
const teamParams = { params: { teamId: 'team-1' } };

describe('POST /api/teams/[teamId]/leave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    createClientMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const response = await POST(teamRequest(), teamParams);
    expect(response.status).toBe(401);
  });

  it('returns 403 when the caller is not a member', async () => {
    mockAuthedUser();
    createAdminClientMock.mockReturnValue(
      buildAdminMock({ membership: null, roster: [] })
    );

    const response = await POST(teamRequest(), teamParams);
    expect(response.status).toBe(403);
  });

  it('deletes the team when the last admin leaves even if other members remain', async () => {
    mockAuthedUser();
    const onMemberDelete = vi.fn();
    const onTeamDelete = vi.fn();
    createAdminClientMock.mockReturnValue(
      buildAdminMock({
        membership: { id: 'm1', role: 'admin' },
        roster: [
          { id: 'm1', role: 'admin' },
          { id: 'm2', role: 'member' },
        ],
        onMemberDelete,
        onTeamDelete,
      })
    );

    const response = await POST(teamRequest(), teamParams);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true, teamDeleted: true });
    expect(onTeamDelete).toHaveBeenCalled();
    // Team delete cascades members, so we don't delete the membership row separately.
    expect(onMemberDelete).not.toHaveBeenCalled();
  });

  it('lets a regular member leave without deleting the team', async () => {
    mockAuthedUser();
    const onMemberDelete = vi.fn();
    const onTeamDelete = vi.fn();
    createAdminClientMock.mockReturnValue(
      buildAdminMock({
        membership: { id: 'm2', role: 'member' },
        roster: [
          { id: 'm1', role: 'admin' },
          { id: 'm2', role: 'member' },
        ],
        onMemberDelete,
        onTeamDelete,
      })
    );

    const response = await POST(teamRequest(), teamParams);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true, teamDeleted: false });
    expect(onMemberDelete).toHaveBeenCalled();
    expect(onTeamDelete).not.toHaveBeenCalled();
  });

  it('deletes the team when the last member leaves', async () => {
    mockAuthedUser();
    const onTeamDelete = vi.fn();
    createAdminClientMock.mockReturnValue(
      buildAdminMock({
        membership: { id: 'm1', role: 'admin' },
        roster: [{ id: 'm1', role: 'admin' }],
        onTeamDelete,
      })
    );

    const response = await POST(teamRequest(), teamParams);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true, teamDeleted: true });
    expect(onTeamDelete).toHaveBeenCalled();
  });
});
