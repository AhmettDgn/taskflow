import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    // 1. Verify auth
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode } = await request.json();
    if (!inviteCode?.trim()) {
      return NextResponse.json({ error: 'Davet kodu gerekli' }, { status: 400 });
    }

    // 2. Admin client bypasses RLS — user already verified above
    const admin = createAdminClient();

    // Ensure profile row exists
    await admin.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    const { data: team, error: findError } = await admin
      .from('teams')
      .select('id, name')
      .eq('invite_code', inviteCode.trim())
      .single();

    if (findError || !team) {
      return NextResponse.json({ error: 'Geçersiz davet kodu' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await admin
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Bu ekibe zaten üyesiniz' }, { status: 409 });
    }

    const { error: memberError } = await admin
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'member' });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
