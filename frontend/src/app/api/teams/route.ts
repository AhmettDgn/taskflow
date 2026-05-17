import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    // 1. Verify auth — server client reads session from request cookie
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Takım adı gerekli' }, { status: 400 });
    }

    // 2. Admin client bypasses RLS — user already verified above
    const admin = createAdminClient();

    // Ensure profile row exists (trigger may not have fired at registration)
    await admin.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    const { data: team, error: teamError } = await admin
      .from('teams')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 400 });
    }

    const { error: memberError } = await admin
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'admin' });

    if (memberError) {
      await admin.from('teams').delete().eq('id', team.id);
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
