import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidTelegramChatId, normalizeTelegramChatId } from '@/lib/server/telegram';

function getFallbackFullName(user: {
  email?: string | null;
  user_metadata?: { full_name?: string | null };
}) {
  return user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null;
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: existingProfile, error: selectError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 400 });
    }

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile });
    }

    const { data: createdProfile, error: insertError } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email ?? '',
        full_name: getFallbackFullName(user),
        avatar_url: user.user_metadata?.avatar_url ?? null,
        telegram_chat_id: null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ profile: createdProfile });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const { fullName, telegramChatId } = await request.json();
    const hasFullName = fullName !== undefined;
    const hasTelegramChatId = telegramChatId !== undefined;

    if (!hasFullName && !hasTelegramChatId) {
      return NextResponse.json({ error: 'Guncellenecek alan bulunamadi' }, { status: 400 });
    }

    const trimmedFullName = hasFullName
      ? String(fullName ?? '').trim()
      : existingProfile?.full_name ?? getFallbackFullName(user);

    if (hasFullName && trimmedFullName.length < 2) {
      return NextResponse.json({ error: 'Ad soyad en az 2 karakter olmali' }, { status: 400 });
    }

    if (hasFullName && trimmedFullName.length > 50) {
      return NextResponse.json({ error: 'Ad soyad en fazla 50 karakter olabilir' }, { status: 400 });
    }

    const normalizedTelegramChatId = hasTelegramChatId
      ? normalizeTelegramChatId(telegramChatId)
      : existingProfile?.telegram_chat_id ?? null;

    if (!isValidTelegramChatId(normalizedTelegramChatId)) {
      return NextResponse.json(
        { error: 'Telegram chat ID yalnizca sayilardan olusmali' },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          full_name: trimmedFullName,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          telegram_chat_id: normalizedTelegramChatId,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (hasFullName) {
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          full_name: trimmedFullName,
        },
      });

      if (authUpdateError) {
        return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
