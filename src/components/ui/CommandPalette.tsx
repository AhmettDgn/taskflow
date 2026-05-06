'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CheckSquare, Bell,
  User, Plus, UserPlus, ArrowRight,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/store/useUIStore';
import { useTeams } from '@/hooks/useTeam';

export function CommandPalette() {
  const { isCommandOpen, toggleCommand } = useUIStore();
  const { data: teams = [] } = useTeams();
  const router = useRouter();

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommand();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleCommand]);

  const go = (href: string) => {
    router.push(href);
    toggleCommand();
  };

  return (
    <CommandDialog open={isCommandOpen} onOpenChange={toggleCommand}>
      <CommandInput placeholder="Nereye gitmek istersiniz?" />
      <CommandList>
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

        <CommandGroup heading="Sayfalar">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/teams', label: 'Ekipler', icon: Users },
            { href: '/tasks', label: 'Görevlerim', icon: CheckSquare },
            { href: '/notifications', label: 'Bildirimler', icon: Bell },
            { href: '/profile', label: 'Profil', icon: User },
          ].map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => go(href)}>
              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {label}
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
            </CommandItem>
          ))}
        </CommandGroup>

        {teams.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Ekipler">
              {teams.map((team) => (
                <CommandItem
                  key={team.id}
                  onSelect={() => go(`/teams/${team.id}/board`)}
                >
                  <div className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  {team.name}
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Eylemler">
          <CommandItem onSelect={() => go('/teams/create')}>
            <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
            Yeni Ekip Oluştur
          </CommandItem>
          <CommandItem onSelect={() => go('/teams/join')}>
            <UserPlus className="mr-2 h-4 w-4 text-muted-foreground" />
            Ekibe Katıl
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
