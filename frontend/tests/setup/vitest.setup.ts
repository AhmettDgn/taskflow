import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (typeof window !== 'undefined' && !('requestIdleCallback' in window)) {
  Object.defineProperty(window, 'requestIdleCallback', {
    writable: true,
    value: (callback: IdleRequestCallback) =>
      setTimeout(
        () =>
          callback({
            didTimeout: false,
            timeRemaining: () => 0,
          }),
        1
      ),
  });
}

if (typeof window !== 'undefined' && !('cancelIdleCallback' in window)) {
  Object.defineProperty(window, 'cancelIdleCallback', {
    writable: true,
    value: (handle: number) => clearTimeout(handle),
  });
}
