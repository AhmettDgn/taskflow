'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, ChevronRight, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
    rest.forEach((s) => {
      if (labels[s]) parts.push(labels[s]);
    });
    return parts;
  }
  if (segments[0] && labels[segments[0]]) return [labels[segments[0]]];
  return [];
}

export function Topbar() {
  const [accountOpen, setAccountOpen] = useState(false);
  const { toggleCommand } = useUIStore();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const breadcrumb = useBreadcrumb();

  const mobileLabel = breadcrumb[breadcrumb.length - 1] ?? 'Dashboard';
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'Hesabım';
  const initials = displayName
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Çıkış yapıldı');
    setAccountOpen(false);
    router.push('/login');
    router.refresh();
  };

  return (
    <>
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
          onClick={toggleCommand}
          className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Ara...</span>
          <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>

        <NotificationBell />

        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
          aria-label="Hesap menüsü"
        >
          {initials || 'U'}
        </button>
      </header>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8 sm:max-w-none">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>Hesap</SheetTitle>
            <SheetDescription>{displayName}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            <SheetClose asChild>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                Profil
              </Link>
            </SheetClose>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl border border-destructive/20 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
