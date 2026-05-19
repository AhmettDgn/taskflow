import { describe, expect, it } from 'vitest';
import {
  getMiddlewareRedirectPath,
  getRootRedirectPath,
  isAuthCallbackPath,
  isAuthPagePath,
} from '@/lib/auth-routing';

describe('auth routing helpers', () => {
  it('detects auth pages', () => {
    expect(isAuthPagePath('/login')).toBe(true);
    expect(isAuthPagePath('/register')).toBe(true);
    expect(isAuthPagePath('/forgot-password/reset')).toBe(true);
    expect(isAuthPagePath('/dashboard')).toBe(false);
  });

  it('detects auth callback paths', () => {
    expect(isAuthCallbackPath('/auth/callback')).toBe(true);
    expect(isAuthCallbackPath('/dashboard')).toBe(false);
  });

  it('returns login redirect for unauthenticated protected routes', () => {
    expect(getMiddlewareRedirectPath({ hasUser: false, pathname: '/dashboard' })).toBe('/login');
  });

  it('returns dashboard redirect for authenticated auth routes', () => {
    expect(getMiddlewareRedirectPath({ hasUser: true, pathname: '/login' })).toBe('/dashboard');
  });

  it('returns null when no redirect is needed', () => {
    expect(getMiddlewareRedirectPath({ hasUser: true, pathname: '/dashboard' })).toBeNull();
  });

  it('computes root redirect path', () => {
    expect(getRootRedirectPath(true)).toBe('/dashboard');
    expect(getRootRedirectPath(false)).toBe('/login');
  });
});
