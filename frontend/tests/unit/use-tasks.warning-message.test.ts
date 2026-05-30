import { describe, expect, it } from 'vitest';
import { getAssignmentWarningToastMessage } from '@/hooks/useTasks';

describe('getAssignmentWarningToastMessage', () => {
  it('returns null when there are no warnings', () => {
    expect(getAssignmentWarningToastMessage([])).toBeNull();
  });

  it('returns the original warning message when there is a single warning', () => {
    expect(
      getAssignmentWarningToastMessage([
        {
          user_id: 'user-1',
          recipient_name: 'Ada',
          reason: 'telegram_not_linked',
          message: 'Ada icin Telegram chat ID tanimli degil.',
        },
      ])
    ).toBe('Ada icin Telegram chat ID tanimli degil.');
  });

  it('summarizes multiple warning types in one toast message', () => {
    expect(
      getAssignmentWarningToastMessage([
        {
          user_id: 'user-1',
          recipient_name: 'Ada',
          reason: 'telegram_not_linked',
          message: 'Ada icin Telegram chat ID tanimli degil.',
        },
        {
          user_id: 'user-2',
          recipient_name: 'Linus',
          reason: 'telegram_send_failed',
          message: 'Linus kullanicisina Telegram mesaji gonderilemedi.',
        },
      ])
    ).toBe('1 kullanicinin Telegram chat ID bilgisi eksik. 1 kullaniciya Telegram mesaji gonderilemedi.');
  });
});
