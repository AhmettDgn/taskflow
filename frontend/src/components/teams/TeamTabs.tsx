'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: 'board', label: 'Board' },
  { href: 'list', label: 'Liste' },
  { href: 'members', label: 'Uyeler' },
  { href: 'settings', label: 'Ayarlar' },
];

interface TeamTabsProps {
  teamId: string;
}

export function TeamTabs({ teamId }: TeamTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const href = `/teams/${teamId}/${tab.href}`;
        const isActive = pathname === href || pathname.startsWith(href + '/');

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              'border-b-2 -mb-px px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
