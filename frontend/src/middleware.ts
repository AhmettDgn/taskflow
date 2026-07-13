import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getMiddlewareRedirectPath } from '@/lib/auth-routing';
import { getPublicRedirectUrl } from '@/lib/public-origin';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Sıcak yol: cookie'deki oturumu lokal oku (network yok). Access token'ın
  // süresine 60 sn'den fazla varsa Supabase Auth'a gitmeden geçir — bu, her
  // sayfa geçişi ve RSC prefetch'inde ödenen ~300-500ms'lik turu kaldırır.
  // Token süresi dolmuş/dolmak üzereyse getUser() çağır: hem doğrular hem
  // refresh edip yeni cookie'leri yazar. Middleware yalnızca yönlendirme
  // kapısıdır; asıl yetkilendirme RLS ve API route'larındaki getUser()'dadır.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const expiresAt = session?.expires_at ?? 0;
  const isFresh = expiresAt * 1000 - Date.now() > 60_000;

  let hasUser = Boolean(session?.user) && isFresh;

  if (session && !isFresh) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasUser = Boolean(user);
  }

  const { pathname } = request.nextUrl;

  const redirectPath = getMiddlewareRedirectPath({
    hasUser,
    pathname,
  });

  if (redirectPath) {
    return NextResponse.redirect(
      getPublicRedirectUrl(redirectPath, {
        headers: request.headers,
        requestUrl: request.url,
      })
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/auth/:path*',
    '/dashboard/:path*',
    '/teams/:path*',
    '/tasks/:path*',
    '/notifications/:path*',
    '/profile/:path*',
  ],
};
