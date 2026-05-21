import { afterEach, describe, expect, it } from 'vitest';
import { getPublicOrigin, getPublicRedirectUrl } from '@/lib/public-origin';

const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

function createHeaders(values: Record<string, string>) {
  return new Headers(values);
}

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
});

describe('public origin helpers', () => {
  it('uses forwarded headers for proxied redirects', () => {
    const headers = createHeaders({
      'x-forwarded-host': 'taskflow.arslanyusuf.com',
      'x-forwarded-proto': 'https',
    });

    expect(getPublicOrigin({ headers, requestUrl: 'http://localhost:3021/dashboard' })).toBe(
      'https://taskflow.arslanyusuf.com'
    );
    expect(getPublicRedirectUrl('/login', { headers })).toBe(
      'https://taskflow.arslanyusuf.com/login'
    );
  });

  it('falls back to the configured app URL before the internal request origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://taskflow.arslanyusuf.com/';

    expect(
      getPublicOrigin({
        headers: createHeaders({ host: 'localhost:3021' }),
        requestUrl: 'http://localhost:3021/',
      })
    ).toBe('https://taskflow.arslanyusuf.com');
  });
});
