import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/teams/[teamId]/documents/route';

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
        data: { user: { id: 'user-1', email: 'uye@example.com', user_metadata: {} } },
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

const documentRequest = (body: unknown) =>
  new Request('http://localhost/api/teams/team-1/documents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
const documentParams = { params: { teamId: 'team-1' } };

const validBody = {
  name: 'rapor.pdf',
  file_path: 'team-1/abc-rapor.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1024,
};

describe('POST /api/teams/[teamId]/documents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    createClientMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    });

    const response = await POST(documentRequest(validBody), documentParams);
    expect(response.status).toBe(401);
  });

  it('returns 403 when the caller is not a team member', async () => {
    mockAuthedUser();
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(membershipQuery(null)) })),
    });

    const response = await POST(documentRequest(validBody), documentParams);
    expect(response.status).toBe(403);
  });

  it("rejects file paths outside the team's folder", async () => {
    mockAuthedUser();
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(membershipQuery('member')) })),
    });

    const response = await POST(
      documentRequest({ ...validBody, file_path: 'team-2/abc-rapor.pdf' }),
      documentParams
    );
    expect(response.status).toBe(400);
  });

  it('rejects disallowed file types', async () => {
    mockAuthedUser();
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(membershipQuery('member')) })),
    });

    const response = await POST(
      documentRequest({
        ...validBody,
        name: 'zararli.exe',
        file_path: 'team-1/abc-zararli.exe',
      }),
      documentParams
    );
    expect(response.status).toBe(400);
  });

  it('creates a document row for a member', async () => {
    mockAuthedUser();

    const createdDocument = {
      id: 'doc-1',
      team_id: 'team-1',
      name: 'rapor.pdf',
      file_path: 'team-1/abc-rapor.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024,
      uploaded_by: 'user-1',
      profiles: null,
    };

    const insertQuery = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: createdDocument, error: null }),
      }),
    };

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnValue(membershipQuery('member')) };
        }
        if (table === 'documents') {
          return { insert: vi.fn().mockReturnValue(insertQuery) };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await POST(documentRequest(validBody), documentParams);
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.document).toEqual(createdDocument);
  });
});
