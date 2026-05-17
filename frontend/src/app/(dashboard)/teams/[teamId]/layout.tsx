'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTeam } from '@/hooks/useTeam';
import { cn } from '@/lib/utils';

const tabs = [
  { href: 'board', label: 'Board' },
  { href: 'list', label: 'Liste' },
  { href: 'members', label: 'Üyeler' },
  { href: 'settings', label: 'Ayarlar' },
];

export default function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { teamId: string };
}) {
  const pathname = usePathname();
  const { data: team } = useTeam(params.teamId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{team?.name ?? 'Ekip'}</h1>
      </div>

      <nav className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const href = `/teams/${params.teamId}/${tab.href}`;
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
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

      <div>{children}</div>
    </div>
  );
}
