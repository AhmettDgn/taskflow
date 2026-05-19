import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyCommandPalette } from '@/components/ui/LazyCommandPalette';
import { useUIStore } from '@/store/useUIStore';

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="lazy-command-palette-content">palette</div>,
}));

const initialState = useUIStore.getState();

describe('LazyCommandPalette', () => {
  beforeEach(() => {
    useUIStore.setState(initialState);
  });

  it('does not mount before keyboard interaction', () => {
    render(<LazyCommandPalette />);
    expect(screen.queryByTestId('lazy-command-palette-content')).not.toBeInTheDocument();
  });

  it('mounts after Ctrl+K and opens the command palette state', () => {
    render(<LazyCommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(screen.getByTestId('lazy-command-palette-content')).toBeInTheDocument();
    expect(useUIStore.getState().isCommandOpen).toBe(true);
  });
});
