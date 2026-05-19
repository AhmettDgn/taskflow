import { describe, expect, it } from 'vitest';
import { getFirstName, getTaskStats } from '@/lib/dashboard';

describe('dashboard helpers', () => {
  it('gets the first name from user metadata first', () => {
    expect(getFirstName({ email: 'user@example.com', user_metadata: { full_name: 'Ada Lovelace' } })).toBe('Ada');
  });

  it('falls back to email local part', () => {
    expect(getFirstName({ email: 'taskflow@example.com', user_metadata: null })).toBe('taskflow');
  });

  it('falls back to default label when user is empty', () => {
    expect(getFirstName({ email: null, user_metadata: null })).toBe('Kullanici');
  });

  it('computes task stats by status', () => {
    expect(getTaskStats(['todo', 'done', 'in_progress', 'todo'])).toEqual({
      total: 4,
      todo: 2,
      inProgress: 1,
      done: 1,
    });
  });
});
