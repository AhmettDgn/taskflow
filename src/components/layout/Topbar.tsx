'use client';

import { usePathname } from 'next/navigation';
import { Search, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { NotificationBell } from '@/components/notifications/NotificationBell';

function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const teamId = segments[1] === 'teams' && segments[2] ? segments[2] : null;
  const { data: team } = useTeam(teamId ?? '');

  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    teams: 'Ekipler',
    tasks: 'Görevlerim',
    notifications: 'Bildirimler',
    profile: 'Profil',
    create: 'Oluştur',
    join: 'Katıl',
    board: 'Board',
    list: 'Liste',
    members: 'Üyeler',
    settings: 'Ayarlar',
    new: 'Yeni',
  };

  const parts: string[] = [];

  if (segments[0] === 'dashboard') return ['Dashboard'];
  if (segments[0] === 'teams') {
    parts.push('Ekipler');
    if (teamId && team) parts.push(team.name);
    const rest = segments.slice(3).filter((s) => !/^[0-9a-f-]{36}$/i.test(s));
    rest.forEach((s) => { if (labels[s]) parts.push(labels[s]); });
    return parts;
  }
  if (segments[0] && labels[segments[0]]) return [labels[segments[0]]];
  return [];
}

export function Topbar() {
  const { toggleCommand } = useUIStore();
  const { user } = useAuth();
  const breadcrumb = useBreadcrumb();

  return (
    <header className="flex h-14 flex-shrink-0 items-center border-b border-border bg-white/80 backdrop-blur-sm px-4 gap-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm min-w-0 flex-1">
        {breadcrumb.map((part, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />}
            <span
              className={
                i === breadcrumb.length - 1
                  ? 'truncate font-semibold text-foreground'
                  : 'truncate text-muted-foreground'
              }
            >
              {part}
            </span>
          </span>
        ))}
      </nav>

      {/* ⌘K Search trigger */}
      <button
        onClick={toggleCommand}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Ara...</span>
        <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <NotificationBell />

      {/* User avatar */}
      {user && (
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary select-none"
          title={user.user_metadata?.full_name ?? user.email ?? ''}
        >
          {(user.user_metadata?.full_name ?? user.email ?? '?')
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>
      )}
    </header>
  );
}
