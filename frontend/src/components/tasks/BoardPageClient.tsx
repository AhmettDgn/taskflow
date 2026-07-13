'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardView } from '@/components/tasks/BoardView';
import { useTaskFilterStore } from '@/store/useTaskFilterStore';
import { useTasks } from '@/hooks/useTasks';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import type { Task } from '@/lib/types';

// Sadece bir görev tıklanınca açılır; ilk boyaya katkısı yok — route chunk'ından çıkar.
const TaskDetailSheet = dynamic(
  () => import('@/components/tasks/TaskDetailSheet').then((mod) => mod.TaskDetailSheet),
  { ssr: false }
);

export function BoardPageClient({ teamId }: { teamId: string }) {
  useRealtimeTasks(teamId);
  const { data: tasks, isLoading } = useTasks(teamId);
  const { searchQuery, selectedStatuses, selectedPriorities } = useTaskFilterStore();

  const filtered: Task[] = (tasks ?? []).filter((task) => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedStatuses.length && !selectedStatuses.includes(task.status)) return false;
    if (selectedPriorities.length && !selectedPriorities.includes(task.priority)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="board-task-count">
          {filtered.length} gorev
        </p>
        <Button asChild size="sm">
          <Link href={`/teams/${teamId}/tasks/new`} data-testid="board-new-task">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Gorev
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

      <TaskDetailSheet teamId={teamId} />
    </div>
  );
}
