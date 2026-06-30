import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/teams/[teamId]/tasks/[taskId]/route';

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

describe('PATCH /api/teams/[teamId]/tasks/[taskId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the requester is not authenticated', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const response = await PATCH(
      new Request('http://localhost/api/teams/team-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      }),
      { params: { teamId: 'team-1', taskId: 'task-1' } }
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when the requester is not a team member', async () => {
    mockAuthedUser();

    const membershipQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    membershipQuery.eq.mockReturnValue(membershipQuery);

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(membershipQuery) })),
    });

    const response = await PATCH(
      new Request('http://localhost/api/teams/team-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      }),
      { params: { teamId: 'team-1', taskId: 'task-1' } }
    );

    expect(response.status).toBe(403);
  });

  it('updates the task status for any team member (bypassing RLS via admin client)', async () => {
    mockAuthedUser();

    const membershipQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' } }),
    };
    membershipQuery.eq.mockReturnValue(membershipQuery);

    const existingTaskQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'task-1' } }),
    };
    existingTaskQuery.eq.mockReturnValue(existingTaskQuery);

    const updatedTask = {
      id: 'task-1',
      team_id: 'team-1',
      title: 'Gorev',
      status: 'done',
      priority: 'medium',
      task_assignees: [],
    };

    const updateQuery = {
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
    };
    updateQuery.eq.mockReturnValue(updateQuery);
    updateQuery.select.mockReturnValue(updateQuery);

    let tasksCallCount = 0;

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnValue(membershipQuery) };
        }

        if (table === 'task_statuses') {
          const taskStatusesQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { value: 'done' }, error: null }),
          };
          return taskStatusesQuery;
        }

        if (table === 'tasks') {
          tasksCallCount += 1;
          if (tasksCallCount === 1) {
            return { select: vi.fn().mockReturnValue(existingTaskQuery) };
          }
          return { update: vi.fn().mockReturnValue(updateQuery) };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await PATCH(
      new Request('http://localhost/api/teams/team-1/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      }),
      { params: { teamId: 'team-1', taskId: 'task-1' } }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.task.status).toBe('done');
  });
});
