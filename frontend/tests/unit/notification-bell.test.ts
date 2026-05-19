import { describe, expect, it } from 'vitest';
import { shouldLoadNotifications } from '@/components/notifications/NotificationBell';

describe('notification loading helper', () => {
  it('stays disabled when the bell is idle and closed', () => {
    expect(shouldLoadNotifications(false, false)).toBe(false);
  });

  it('enables loading when the bell is open', () => {
    expect(shouldLoadNotifications(false, true)).toBe(true);
  });

  it('enables loading after idle readiness', () => {
    expect(shouldLoadNotifications(true, false)).toBe(true);
  });
});
