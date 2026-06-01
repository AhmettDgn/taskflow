'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { useTaskPanelStore } from '@/store/useTaskPanelStore';

interface TaskDetailSheetProps {
  teamId: string;
}

/**
 * Board üzerinde sağdan açılan görev detay/düzenleme paneli.
 * Hangi görevin açık olduğu useTaskPanelStore'dan okunur; tek instance mount edilir.
 */
export function TaskDetailSheet({ teamId }: TaskDetailSheetProps) {
  const openTaskId = useTaskPanelStore((state) => state.openTaskId);
  const close = useTaskPanelStore((state) => state.close);

  return (
    <Sheet open={openTaskId !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Görev Detayı</SheetTitle>
        {openTaskId && (
          <TaskDetailPanel
            key={openTaskId}
            teamId={teamId}
            taskId={openTaskId}
            onClose={close}
            onDeleted={close}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
