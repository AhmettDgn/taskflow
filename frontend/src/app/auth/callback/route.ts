import { NextResponse } from 'next/server';
import { getPublicRedirectUrl } from '@/lib/public-origin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next')?.startsWith('/') ? searchParams.get('next')! : '/dashboard';
  const redirectOptions = {
    headers: request.headers,
    requestUrl: request.url,
  };

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(getPublicRedirectUrl(next, redirectOptions));
    }
  }

  return NextResponse.redirect(
    getPublicRedirectUrl('/login?error=auth_callback_failed', redirectOptions)
  );
}
