import { describe, expect, it } from 'vitest';
import { loadDashboardPageData } from '@/lib/dashboard';

function createDashboardSupabase({
  user,
  memberships = [],
  tasks = [],
}: {
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null } | null } | null;
  memberships?: Array<{ teams: { id: string; name: string; created_by: string; invite_code: string; created_at: string } | null }>;
  tasks?: Array<{ status: 'todo' | 'in_progress' | 'done' | 'on_hold' }>;
}) {
  // Yeni tek-sorgu akışı: teams embed'i tasks(status) içerir.
  const membershipsWithTasks = memberships.map((membership, index) => ({
    teams: membership.teams ? { ...membership.teams, tasks: index === 0 ? tasks : [] } : null,
  }));

  return {
    auth: {
      getSession: async () => ({ data: { session: user ? { user } : null } }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          if (table === 'team_members') {
            return {
              order: async () => ({
                data: membershipsWithTasks,
                error: null,
              }),
            };
          }

          throw new Error(`Unsupported table ${table}`);
        },
      }),
    }),
  };
}

describe('loadDashboardPageData', () => {
  it('returns redirect information when the user is missing', async () => {
    await expect(loadDashboardPageData(createDashboardSupabase({ user: null }) as never)).resolves.toEqual({
      redirectTo: '/login',
    });
  });

  it('returns server-first dashboard data when the user exists', async () => {
    const data = await loadDashboardPageData(
      createDashboardSupabase({
        user: {
          id: 'user-1',
          email: 'taskflow@example.com',
          user_metadata: { full_name: 'Ada Lovelace' },
        },
        memberships: [
          {
            teams: {
              id: 'team-1',
              name: 'Core Team',
              created_by: 'user-1',
              invite_code: 'invite',
              created_at: '2026-01-01T00:00:00.000Z',
            },
          },
        ],
        tasks: [{ status: 'todo' }, { status: 'done' }],
      }) as never
    );

    if ('redirectTo' in data) {
      throw new Error('Expected dashboard data but received redirect');
    }

    expect(data.firstName).toBe('Ada');
    expect(data.firstTeamId).toBe('team-1');
    expect(data.taskStats.total).toBe(2);
    expect(data.taskStats.todo).toBe(1);
    expect(data.taskStats.done).toBe(1);
  });
});
