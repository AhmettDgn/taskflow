'use client';

import { useRouter } from 'next/navigation';
import { TaskForm } from '@/components/tasks/TaskForm';

export default function NewTaskPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const router = useRouter();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="new-task-heading">Yeni Görev</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ekip için yeni bir görev oluşturun.</p>
      </div>
      <div className="rounded-xl border border-border bg-white p-6">
        <TaskForm
          teamId={teamId}
          onSuccess={() => router.push(`/teams/${teamId}/board`)}
        />
      </div>
    </div>
  );
}
