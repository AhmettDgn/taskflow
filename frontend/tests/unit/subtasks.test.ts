import { describe, expect, it } from 'vitest';
import { getAutoCompleteStatus } from '@/hooks/useSubtasks';
import type { TaskStatusColumn } from '@/lib/types';

function column(value: string, position: number): TaskStatusColumn {
  return { value, label: value, color: 'slate', position };
}

describe('getAutoCompleteStatus', () => {
  it('falls back to done when statuses are missing', () => {
    expect(getAutoCompleteStatus(undefined)).toBe('done');
    expect(getAutoCompleteStatus([])).toBe('done');
  });

  it('prefers the done column when it exists', () => {
    expect(
      getAutoCompleteStatus([column('todo', 0), column('done', 2), column('in_progress', 1)])
    ).toBe('done');
  });

  it('uses the last column when done was replaced by custom columns', () => {
    expect(
      getAutoCompleteStatus([column('backlog', 0), column('inceleme', 1), column('bitti', 2)])
    ).toBe('bitti');
  });
});
