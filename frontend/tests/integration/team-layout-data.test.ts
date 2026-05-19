import { describe, expect, it } from 'vitest';
import { loadTeamLayoutData } from '@/lib/team-layout';

function createTeamSupabase(team: { id: string; name: string } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: team,
            error: team ? null : { message: 'Not found' },
          }),
        }),
      }),
    }),
  };
}

describe('loadTeamLayoutData', () => {
  it('returns a notFound result when the team does not exist', async () => {
    await expect(loadTeamLayoutData(createTeamSupabase(null) as never, 'missing')).resolves.toEqual({
      notFound: true,
    });
  });

  it('returns team data when the team exists', async () => {
    await expect(
      loadTeamLayoutData(createTeamSupabase({ id: 'team-1', name: 'Core Team' }) as never, 'team-1')
    ).resolves.toEqual({
      notFound: false,
      team: { id: 'team-1', name: 'Core Team' },
    });
  });
});
