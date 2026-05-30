import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from('team_members')
      .select('id, role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Bu ekibin uyesi degilsiniz' }, { status: 403 });
    }

    const { data: allMembers, error: membersError } = await admin
      .from('team_members')
      .select('id, role')
      .eq('team_id', teamId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 400 });
    }

    const members = allMembers ?? [];
    const isLastMember = members.length <= 1;
    const adminCount = members.filter((member) => member.role === 'admin').length;
    const isOnlyAdmin = membership.role === 'admin' && adminCount <= 1;

    // If the team would be left with no admin (the leaver is the last member, or the
    // last remaining admin), delete the whole team. The teams FK cascades team_members,
    // tasks, comments, etc., so this also removes the leaver's membership.
    const teamDeleted = isLastMember || isOnlyAdmin;

    if (teamDeleted) {
      const { error: teamDeleteError } = await admin.from('teams').delete().eq('id', teamId);
      if (teamDeleteError) {
        return NextResponse.json({ error: teamDeleteError.message }, { status: 400 });
      }
    } else {
      const { error: deleteError } = await admin
        .from('team_members')
        .delete()
        .eq('id', membership.id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, teamDeleted });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
