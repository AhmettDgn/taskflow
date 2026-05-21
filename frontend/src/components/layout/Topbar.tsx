'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ChevronRight, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';
import { useSignOut } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import type { UserSummary } from '@/lib/types';
import { NotificationBell } from '@/components/notifications/NotificationBell';

function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const teamId = segments[1] === 'teams' && segments[2] ? segments[2] : null;
  const { data: team } = useTeam(teamId ?? '');

  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    teams: 'Ekipler',
    tasks: 'Gorevlerim',
    notifications: 'Bildirimler',
    profile: 'Profil',
    create: 'Olustur',
    join: 'Katil',
    board: 'Board',
    list: 'Liste',
    members: 'Uyeler',
    settings: 'Ayarlar',
    new: 'Yeni',
  };

  const parts: string[] = [];

  if (segments[0] === 'dashboard') return ['Dashboard'];
  if (segments[0] === 'teams') {
    parts.push('Ekipler');
    if (teamId && team) parts.push(team.name);
    const rest = segments.slice(3).filter((segment) => !/^[0-9a-f-]{36}$/i.test(segment));
    rest.forEach((segment) => {
      if (labels[segment]) parts.push(labels[segment]);
    });
    return parts;
  }
  if (segments[0] && labels[segments[0]]) return [labels[segments[0]]];
  return [];
}

interface TopbarProps {
  user: UserSummary | null;
}

export function Topbar({ user }: TopbarProps) {
  const { setCommandOpen } = useUIStore();
  const signOut = useSignOut();
  const router = useRouter();
  const breadcrumb = useBreadcrumb();

  const mobileLabel = breadcrumb[breadcrumb.length - 1] ?? 'Dashboard';
  const displayName = user?.fullName ?? user?.email ?? 'Hesabim';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Cikis yapildi');
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-border bg-white/80 px-3 backdrop-blur-sm sm:px-4">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground md:hidden">
          {mobileLabel}
        </div>

        <nav className="hidden min-w-0 items-center gap-1 text-sm md:flex">
          {breadcrumb.map((part, index) => (
            <span key={index} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              )}
              <span
                className={
                  index === breadcrumb.length - 1
                    ? 'truncate font-semibold text-foreground'
                    : 'truncate text-muted-foreground'
                }
              >
                {part}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <button
        onClick={() => setCommandOpen(true)}
        className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
        data-testid="command-palette-trigger"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Ara...</span>
        <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          Ctrl K
        </kbd>
      </button>

      <Link
        href="/profile"
        className="hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent md:flex"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {initials || 'U'}
        </span>
        <span className="max-w-28 truncate">{displayName}</span>
      </Link>

      <NotificationBell />

      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-lg border border-destructive/20 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
        data-testid="topbar-logout"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Cikis</span>
      </button>

      <Link
        href="/profile"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary transition-colors hover:bg-primary/15 md:hidden"
        aria-label="Profil"
        data-testid="account-menu-trigger"
      >
        <User className="h-4 w-4" />
      </Link>
    </header>
  );
}
