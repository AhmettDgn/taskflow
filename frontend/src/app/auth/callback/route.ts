import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedHost) {
    return `${forwardedProto ?? url.protocol.replace(':', '')}://${forwardedHost}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next')?.startsWith('/') ? searchParams.get('next')! : '/dashboard';
  const origin = getRequestOrigin(request);

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
