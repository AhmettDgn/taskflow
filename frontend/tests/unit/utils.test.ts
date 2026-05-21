import { describe, expect, it, vi } from 'vitest';
import { getAppOrigin, getAuthRedirectOrigin } from '@/lib/utils';

describe('origin helpers', () => {
  it('prefers NEXT_PUBLIC_APP_URL when it is configured', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://taskflow.arslanyusuf.com/';

    expect(getAppOrigin()).toBe('https://taskflow.arslanyusuf.com');
    expect(getAuthRedirectOrigin()).toBe('https://taskflow.arslanyusuf.com');

    process.env.NEXT_PUBLIC_APP_URL = previous;
  });

  it('falls back to the browser origin when the env is missing', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = '';

    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:3021',
      },
    });

    expect(getAppOrigin()).toBe('http://localhost:3021');
    expect(getAuthRedirectOrigin()).toBe('http://localhost:3021');

    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_APP_URL = previous;
  });
});
