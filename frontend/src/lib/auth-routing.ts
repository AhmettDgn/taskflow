export const AUTH_PAGE_PATHS = ['/login', '/register', '/forgot-password'] as const;

export const MIDDLEWARE_MATCHER = [
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
] as const;

export function isAuthPagePath(pathname: string) {
  return AUTH_PAGE_PATHS.some((path) => pathname.startsWith(path));
}

export function isAuthCallbackPath(pathname: string) {
  return pathname.startsWith('/auth/');
}

export function getMiddlewareRedirectPath({
  hasUser,
  pathname,
}: {
  hasUser: boolean;
  pathname: string;
}) {
  if (!hasUser && !isAuthPagePath(pathname) && !isAuthCallbackPath(pathname)) {
    return '/login';
  }

  if (hasUser && isAuthPagePath(pathname)) {
    return '/dashboard';
  }

  return null;
}

export function getRootRedirectPath(hasUser: boolean) {
  return hasUser ? '/dashboard' : '/login';
}
