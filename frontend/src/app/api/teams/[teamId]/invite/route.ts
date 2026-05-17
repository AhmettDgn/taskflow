import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;

    // 1. Verify requester is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'E-posta adresi gerekli' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 2. Verify requester is admin of this team
    const { data: requesterMembership } = await admin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!requesterMembership || requesterMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    }

    // 3. Find invited user by email
    const { data: invitee } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (!invitee) {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // 4. Check if already a member
    const { data: existing } = await admin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', invitee.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Bu kullanıcı zaten ekip üyesi' },
        { status: 409 }
      );
    }

    // 5. Add as member
    const { error: memberError } = await admin
      .from('team_members')
      .insert({ team_id: teamId, user_id: invitee.id, role: 'member' });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: `${invitee.full_name ?? invitee.email} ekibe eklendi`,
      member: invitee,
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
