'use client';

import Link from 'next/link';
import { CheckCheck, ExternalLink } from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import { formatDate } from '@/lib/utils';

const typeLabels: Record<NotificationType, string> = {
  task_assigned: 'Göreve atandınız',
  status_changed: 'Görev durumu değişti',
  comment_added: 'Yeni yorum',
};

const typeDotColors: Record<NotificationType, string> = {
  task_assigned: 'bg-primary',
  status_changed: 'bg-amber-500',
  comment_added: 'bg-green-500',
};

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
}

export function NotificationDropdown({ notifications, onClose }: NotificationDropdownProps) {
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    onClose();
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">Bildirimler</span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAll}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Tümünü okundu işaretle
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Henüz bildirim yok
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {notifications.map((notification) => {
            const label = typeLabels[notification.type as NotificationType] ?? notification.type;
            const dotColor = typeDotColors[notification.type as NotificationType] ?? 'bg-gray-400';

            const content = (
              <div
                className={`flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleClick(notification)}
              >
                <div className="mt-1.5 flex-shrink-0">
                  <span className={`block h-2 w-2 rounded-full ${notification.is_read ? 'bg-gray-200' : dotColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notification.is_read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                    {label}
                  </p>
                  {notification.content && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {notification.content}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              </div>
            );

            if (notification.task_id) {
              return (
                <Link key={notification.id} href={`#`} className="block cursor-pointer">
                  {content}
                </Link>
              );
            }

            return <div key={notification.id} className="cursor-pointer">{content}</div>;
          })}
        </div>
      )}

      <div className="border-t border-border px-4 py-2">
        <Link
          href="/notifications"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
          onClick={onClose}
        >
          Tüm bildirimleri gör
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
