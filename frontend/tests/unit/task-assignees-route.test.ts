import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/teams/[teamId]/tasks/[taskId]/assignees/route';

const {
  createClientMock,
  createAdminClientMock,
  sendTaskAssignmentNotificationsMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  sendTaskAssignmentNotificationsMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/server/telegram', () => ({
  sendTaskAssignmentNotifications: sendTaskAssignmentNotificationsMock,
}));

describe('PATCH /api/teams/[teamId]/tasks/[taskId]/assignees', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@example.com',
              user_metadata: { full_name: 'Owner Name' },
            },
          },
          error: null,
        }),
      },
    });
  });

  it('blocks removals for non-admin members', async () => {
    const membershipQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' } }),
    };
    membershipQuery.eq.mockReturnValue(membershipQuery);

    const taskLookupQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'task-1',
          title: 'Yeni gorev',
          status: 'todo',
          priority: 'medium',
          due_date: null,
          team_id: 'team-1',
        },
      }),
    };
    taskLookupQuery.eq.mockReturnValue(taskLookupQuery);

    const currentAssigneesQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user-2' }],
          error: null,
        }),
      }),
    };

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnValue(membershipQuery) };
        }

        if (table === 'tasks') {
          return { select: vi.fn().mockReturnValue(taskLookupQuery) };
        }

        if (table === 'task_assignees') {
          return currentAssigneesQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await PATCH(
      new Request('http://localhost/api/teams/team-1/tasks/task-1/assignees', {
        method: 'PATCH',
        body: JSON.stringify({ userIds: [] }),
      }),
      { params: { teamId: 'team-1', taskId: 'task-1' } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Atama kaldirmak icin admin olmaniz gerekir',
    });
  });

  it('sends Telegram only for newly added assignees', async () => {
    const membershipQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' } }),
    };
    membershipQuery.eq.mockReturnValue(membershipQuery);

    const teamValidationQuery = {
      eq: vi.fn(),
      in: vi.fn().mockResolvedValue({
        data: [{ user_id: 'user-2' }, { user_id: 'user-3' }],
        error: null,
      }),
    };
    teamValidationQuery.eq.mockReturnValue(teamValidationQuery);

    const taskLookupQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'task-1',
          title: 'Yeni gorev',
          status: 'todo',
          priority: 'medium',
          due_date: null,
          team_id: 'team-1',
        },
      }),
    };
    taskLookupQuery.eq.mockReturnValue(taskLookupQuery);

    const currentAssigneesSelect = {
      eq: vi.fn().mockResolvedValue({
        data: [{ user_id: 'user-2' }],
        error: null,
      }),
    };

    const insertMock = vi.fn().mockResolvedValue({ error: null });

    const teamQuery = {
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { name: 'Core Team' } }),
      }),
    };

    const profilesRecipientsQuery = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user-3',
              email: 'new@example.com',
              full_name: 'New User',
              avatar_url: null,
              telegram_chat_id: '12345',
            },
          ],
        }),
      }),
    };

    const updatedTaskQuery = {
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'task-1',
            title: 'Yeni gorev',
            status: 'todo',
            priority: 'medium',
            due_date: null,
            team_id: 'team-1',
            task_assignees: [
              { id: 'ta-1', task_id: 'task-1', user_id: 'user-2' },
              { id: 'ta-2', task_id: 'task-1', user_id: 'user-3' },
            ],
          },
          error: null,
        }),
      }),
    };

    let teamMembersCallCount = 0;
    let tasksCallCount = 0;

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'team_members') {
          teamMembersCallCount += 1;
          return {
            select: vi.fn().mockReturnValue(teamMembersCallCount === 1 ? membershipQuery : teamValidationQuery),
          };
        }

        if (table === 'tasks') {
          tasksCallCount += 1;
          return { select: vi.fn().mockReturnValue(tasksCallCount === 1 ? taskLookupQuery : updatedTaskQuery) };
        }

        if (table === 'task_assignees') {
          return {
            select: vi.fn().mockReturnValue(currentAssigneesSelect),
            insert: insertMock,
          };
        }

        if (table === 'teams') {
          return { select: vi.fn().mockReturnValue(teamQuery) };
        }

        if (table === 'profiles') {
          return profilesRecipientsQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    sendTaskAssignmentNotificationsMock.mockResolvedValue([]);

    const response = await PATCH(
      new Request('http://localhost/api/teams/team-1/tasks/task-1/assignees', {
        method: 'PATCH',
        body: JSON.stringify({ userIds: ['user-2', 'user-3'] }),
      }),
      { params: { teamId: 'team-1', taskId: 'task-1' } }
    );

    expect(response.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith([{ task_id: 'task-1', user_id: 'user-3' }]);
    expect(sendTaskAssignmentNotificationsMock).toHaveBeenCalledTimes(1);
    expect(sendTaskAssignmentNotificationsMock.mock.calls[0][0].recipients).toEqual([
      expect.objectContaining({ id: 'user-3' }),
    ]);
  });
});
