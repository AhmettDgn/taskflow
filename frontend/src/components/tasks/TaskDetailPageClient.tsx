'use client';

import { useRouter } from 'next/navigation';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

export function TaskDetailPageClient({ teamId, taskId }: { teamId: string; taskId: string }) {
  const router = useRouter();
  useRealtimeTasks(teamId);

  return (
    <div className="mx-auto max-w-2xl">
      <TaskDetailPanel
        teamId={teamId}
        taskId={taskId}
        onClose={() => router.back()}
        onDeleted={() => router.push(`/teams/${teamId}/board`)}
      />
    </div>
  );
}
