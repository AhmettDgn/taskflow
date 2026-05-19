'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { CommandPalette } from '@/components/ui/CommandPalette';

export function LazyCommandPalette() {
  const [isEnabled, setIsEnabled] = useState(false);
  const isCommandOpen = useUIStore((state) => state.isCommandOpen);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsEnabled(true);

        const { isCommandOpen, setCommandOpen } = useUIStore.getState();
        setCommandOpen(!isCommandOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isEnabled && !isCommandOpen) {
    return null;
  }

  return <CommandPalette />;
}
