'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, useRealtimeNotifications } from '@/hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

export function shouldLoadNotifications(isReady: boolean, isOpen: boolean) {
  return isReady || isOpen;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const shouldFetchNotifications = shouldLoadNotifications(isReady, isOpen);
  const { data: notifications = [] } = useNotifications({ enabled: shouldFetchNotifications });

  useRealtimeNotifications({ enabled: shouldFetchNotifications });

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const browserWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (
          callback: IdleRequestCallback,
          options?: IdleRequestOptions
        ) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (typeof browserWindow.requestIdleCallback === 'function') {
      const idleId = browserWindow.requestIdleCallback(() => setIsReady(true), { timeout: 1500 });
      return () => browserWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = setTimeout(() => setIsReady(true), 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Bildirimler"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative"
        data-testid="notification-bell-button"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-white shadow-lg sm:w-80"
          data-testid="notification-dropdown"
        >
          <NotificationDropdown
            notifications={notifications}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
