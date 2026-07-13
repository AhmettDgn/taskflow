'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, CheckSquare, Calendar, Flag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTeams } from '@/hooks/useTeam';
import { useTasks } from '@/hooks/useTasks';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { getTaskStatusLabel } from '@/lib/task-statuses';
import { formatDate } from '@/lib/utils';
import type { Task } from '@/lib/types';

const priorityConfig: Record<Task['priority'], { label: string; className: string }> = {
  low: { label: 'Düşük', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Orta', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'Yüksek', className: 'bg-red-50 text-red-700 border-red-200' },
};


function TeamTaskSection({ teamId, teamName, search }: { teamId: string; teamName: string; search: string }) {
  const { data: tasks, isLoading } = useTasks(teamId);
  const { data: taskStatuses } = useTaskStatuses(teamId);

  const filtered = (tasks ?? []).filter((task) =>
    !search || task.title.toLowerCase().includes(search.toLowerCase())
  );

  if (!isLoading && filtered.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {teamName}
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        {isLoading ? (
          <div className="divide-y">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="ml-auto h-6 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((task) => (
              <Link
                key={task.id}
                href={`/teams/${teamId}/tasks/${task.id}`}
                prefetch={false}
                className="flex flex-col items-start gap-2 px-4 py-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{getTaskStatusLabel(task.status, taskStatuses)}</p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                  <Badge variant="outline" className={priorityConfig[task.priority].className}>
                    <Flag className="mr-1 h-2.5 w-2.5" />
                    {priorityConfig[task.priority].label}
                  </Badge>
                  {task.due_date && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Calendar className="mr-1 h-2.5 w-2.5" />
                      {formatDate(task.due_date)}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksPageClient() {
  const [search, setSearch] = useState('');
  const { data: teams, isLoading: teamsLoading } = useTeams();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="tasks-heading">Görevlerim</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tüm ekiplerdeki görevler</p>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Görev ara..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      {teamsLoading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {!teamsLoading && (!teams || teams.length === 0) && (
        <EmptyState
          icon={CheckSquare}
          title="Henüz görev yok"
          description="Önce bir ekip oluşturun veya ekibe katılın."
          action={{ label: 'Ekip Oluştur', href: '/teams/create' }}
        />
      )}

      {!teamsLoading && teams && teams.length > 0 && (
        <div className="space-y-6">
          {teams.map((team) => (
            <TeamTaskSection
              key={team.id}
              teamId={team.id}
              teamName={team.name}
              search={search}
            />
          ))}
        </div>
      )}
    </div>
  );
}
