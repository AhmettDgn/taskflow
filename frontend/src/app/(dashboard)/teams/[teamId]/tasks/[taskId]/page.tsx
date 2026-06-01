'use client';

import { useRouter } from 'next/navigation';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

export default function TaskDetailPage({
  params,
}: {
  params: { teamId: string; taskId: string };
}) {
  const { teamId, taskId } = params;
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
