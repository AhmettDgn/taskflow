'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CheckSquare, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teams', label: 'Ekipler', icon: Users },
  { href: '/tasks', label: 'Gorevler', icon: CheckSquare },
  { href: '/notifications', label: 'Bildirimler', icon: Bell },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white md:hidden">
      <div className="flex items-center justify-around py-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-gray-500 hover:text-primary'
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
