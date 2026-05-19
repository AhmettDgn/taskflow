'use client';

import { CheckCheck, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useRealtimeNotifications,
} from '@/hooks/useNotifications';
import { formatDate } from '@/lib/utils';
import type { NotificationType } from '@/lib/types';

const typeLabels: Record<NotificationType, string> = {
  task_assigned: 'Göreve Atandınız',
  status_changed: 'Durum Değişti',
  comment_added: 'Yeni Yorum',
};

const typeBadgeColors: Record<NotificationType, string> = {
  task_assigned: 'bg-primary/10 text-primary border-primary/20',
  status_changed: 'bg-amber-50 text-amber-700 border-amber-200',
  comment_added: 'bg-green-50 text-green-700 border-green-200',
};

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAsRead();
  useRealtimeNotifications();

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="notifications-heading">Bildirimler</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {unreadCount} okunmamış bildirim
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAll}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {isLoading && (
          <div className="divide-y">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-4">
                <Skeleton className="mt-1 h-2 w-2 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">Bildirim yok</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Görev atamalarında ve yorumlarda bildirim alacaksınız.
            </p>
          </div>
        )}

        {!isLoading && notifications && notifications.length > 0 && (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const label = typeLabels[notification.type as NotificationType] ?? notification.type;
              const badgeColor = typeBadgeColors[notification.type as NotificationType] ?? '';

              return (
                <div
                  key={notification.id}
                  className={`flex gap-3 px-4 py-4 transition-colors hover:bg-gray-50 cursor-pointer ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (!notification.is_read) markAsRead(notification.id);
                  }}
                >
                  <div className="mt-2 flex-shrink-0">
                    <span
                      className={`block h-2 w-2 rounded-full transition-colors ${
                        notification.is_read ? 'bg-gray-200' : 'bg-primary'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${badgeColor}`}>
                        {label}
                      </Badge>
                      {!notification.is_read && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                          Yeni
                        </Badge>
                      )}
                    </div>
                    {notification.content && (
                      <p className="mt-1 text-sm text-gray-700">{notification.content}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
