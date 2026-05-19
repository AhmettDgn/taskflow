import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '@/store/useUIStore';

const initialState = useUIStore.getState();

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState(initialState);
  });

  it('opens and closes the command palette', () => {
    useUIStore.getState().setCommandOpen(true);
    expect(useUIStore.getState().isCommandOpen).toBe(true);

    useUIStore.getState().toggleCommand();
    expect(useUIStore.getState().isCommandOpen).toBe(false);
  });

  it('toggles sidebar collapse state', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    useUIStore.getState().toggleSidebarCollapsed();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });
});
