import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuthorizedContext {
  user: { id: string; email?: string | null };
  admin: SupabaseClient;
  membership: { role: string };
  error?: never;
}

interface AuthorizationError {
  error: NextResponse;
  user?: never;
  admin?: never;
  membership?: never;
}

/**
 * Verifies the caller is authenticated and a member of the team. Returns an admin
 * (service-role) client for RLS-bypassing writes after the membership check, plus the
 * caller's membership row (use `membership.role` for admin-only gating). On failure
 * returns `{ error }` with the appropriate NextResponse (401 / 403).
 */
export async function authorizeTeamMember(
  teamId: string
): Promise<AuthorizedContext | AuthorizationError> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return { error: NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 }) };
  }

  return { user, admin, membership };
}
