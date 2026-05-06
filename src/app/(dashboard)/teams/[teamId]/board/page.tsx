'use client';

import Link from 'next/link';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardView } from '@/components/tasks/BoardView';
import { useTaskFilterStore } from '@/store/useTaskFilterStore';
import { useTasks } from '@/hooks/useTasks';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import type { Task } from '@/lib/types';

export default function BoardPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  useRealtimeTasks(teamId);
  const { data: tasks, isLoading } = useTasks(teamId);
  const { searchQuery, selectedStatuses, selectedPriorities } = useTaskFilterStore();

  const filtered: Task[] = (tasks ?? []).filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedStatuses.length && !selectedStatuses.includes(t.status)) return false;
    if (selectedPriorities.length && !selectedPriorities.includes(t.priority)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} görev
        </p>
        <Button asChild size="sm">
          <Link href={`/teams/${teamId}/tasks/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Görev
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <BoardView tasks={filtered} teamId={teamId} />
      )}
    </div>
  );
}
