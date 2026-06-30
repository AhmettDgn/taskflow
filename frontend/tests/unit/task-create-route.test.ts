import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/teams/[teamId]/tasks/route';

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

describe('POST /api/teams/[teamId]/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the requester is not authenticated', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Yeni gorev',
          status: 'todo',
          priority: 'medium',
        }),
      }),
      { params: { teamId: 'team-1' } }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('creates the task and returns Telegram warnings without failing the request', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@example.com',
              user_metadata: { full_name: 'Owner Name', avatar_url: null },
            },
          },
          error: null,
        }),
      },
    });

    const membershipQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' } }),
    };
    membershipQuery.eq.mockReturnValue(membershipQuery);

    const memberValidationQuery = {
      eq: vi.fn(),
      in: vi.fn().mockResolvedValue({ data: [{ user_id: 'user-2' }], error: null }),
    };
    memberValidationQuery.eq.mockReturnValue(memberValidationQuery);

    const teamQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'team-1', name: 'Core Team' } }),
    };
    teamQuery.eq.mockReturnValue(teamQuery);

    const createdTask = {
      id: 'task-1',
      team_id: 'team-1',
      title: 'Yeni gorev',
      description: null,
      status: 'todo',
      priority: 'medium',
      due_date: null,
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    const taskInsertQuery = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: createdTask, error: null }),
      }),
    };

    const taskSelectQuery = {
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { ...createdTask, task_assignees: [{ id: 'ta-1', task_id: 'task-1', user_id: 'user-2' }] },
        }),
      }),
    };

    const assigneeInsertQuery = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const profilesUpsertQuery = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    const profilesRecipientsQuery = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'user-2',
              email: 'assignee@example.com',
              full_name: 'Assignee',
              avatar_url: null,
              telegram_chat_id: null,
            },
          ],
        }),
      }),
    };

    let teamMembersCallCount = 0;
    let tasksCallCount = 0;
    let profilesCallCount = 0;

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          profilesCallCount += 1;
          return profilesCallCount === 1 ? profilesUpsertQuery : profilesRecipientsQuery;
        }

        if (table === 'team_members') {
          teamMembersCallCount += 1;
          return {
            select: vi.fn().mockReturnValue(teamMembersCallCount === 1 ? membershipQuery : memberValidationQuery),
          };
        }

        if (table === 'teams') {
          return { select: vi.fn().mockReturnValue(teamQuery) };
        }

        if (table === 'task_statuses') {
          const taskStatusesQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { value: 'todo' }, error: null }),
          };
          return taskStatusesQuery;
        }

        if (table === 'tasks') {
          tasksCallCount += 1;
          if (tasksCallCount === 1) {
            return { insert: vi.fn().mockReturnValue(taskInsertQuery) };
          }

          return { select: vi.fn().mockReturnValue(taskSelectQuery) };
        }

        if (table === 'task_assignees') {
          return assigneeInsertQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    sendTaskAssignmentNotificationsMock.mockResolvedValue([
      {
        user_id: 'user-2',
        recipient_name: 'Assignee',
        reason: 'telegram_not_linked',
        message: 'Assignee icin Telegram chat ID tanimli degil.',
      },
    ]);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Yeni gorev',
          status: 'todo',
          priority: 'medium',
          assignee_ids: ['user-2'],
        }),
      }),
      { params: { teamId: 'team-1' } }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.warnings).toHaveLength(1);
    expect(sendTaskAssignmentNotificationsMock).toHaveBeenCalledTimes(1);
  });
});
