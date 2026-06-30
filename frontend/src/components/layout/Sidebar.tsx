'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CheckSquare, Bell,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';
import { useSignOut } from '@/hooks/useAuth';
import { APP_NAME } from '@/lib/constants';
import type { UserSummary } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teams', label: 'Ekipler', icon: Users },
  { href: '/tasks', label: 'Gorevlerim', icon: CheckSquare },
  { href: '/notifications', label: 'Bildirimler', icon: Bell },
];

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium',
        'transition-colors duration-150',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      {isActive && (
        <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-full bg-primary" />
      )}
      <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <div title={label}>{link}</div>
    );
  }

  return link;
}

interface SidebarProps {
  user: UserSummary | null;
}

export function Sidebar({ user }: SidebarProps) {
  const { sidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const signOut = useSignOut();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Cikis yapildi');
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={cn(
        'hidden flex-shrink-0 flex-col border-r border-border bg-white transition-[width] duration-200 ease-spring md:flex',
        !sidebarOpen ? 'md:hidden' : sidebarCollapsed ? 'md:w-[3.5rem]' : 'md:w-64'
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3',
          sidebarCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!sidebarCollapsed && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-primary"
          >
            <img src="/logo.svg" alt="TaskFlow Logo" className="h-6 w-6 rounded" />
            <span>{APP_NAME}</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center">
            <img src="/logo.svg" alt="TaskFlow Logo" className="h-8 w-8 rounded-lg" />
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/');

          return (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={Icon}
              isActive={isActive}
              collapsed={sidebarCollapsed}
            />
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        {!sidebarCollapsed && user && (
          <div className="mb-1.5 flex items-center gap-2.5 rounded-md px-2.5 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {getInitials(user.fullName ?? user.email ?? null)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {user.fullName ?? user.email ?? ''}
              </p>
            </div>
          </div>
        )}

        <div className={cn('flex', sidebarCollapsed ? 'flex-col gap-0.5' : 'items-center gap-1')}>
          <button
            onClick={handleSignOut}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-muted-foreground',
              'transition-colors hover:bg-destructive/10 hover:text-destructive',
              sidebarCollapsed ? 'w-full justify-center' : 'flex-1'
            )}
            data-testid="sidebar-logout"
            title="Cikis Yap"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && 'Cikis'}
          </button>

          <button
            onClick={toggleSidebarCollapsed}
            className={cn(
              'flex items-center justify-center rounded-md p-2 text-muted-foreground',
              'transition-colors hover:bg-accent hover:text-accent-foreground',
              sidebarCollapsed ? 'w-full' : 'ml-auto'
            )}
            aria-label={sidebarCollapsed ? 'Genislet' : 'Daralt'}
            title={sidebarCollapsed ? 'Genislet' : 'Daralt'}
          >
            {sidebarCollapsed
              ? <ChevronRight className="h-3.5 w-3.5" />
              : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
