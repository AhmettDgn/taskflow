'use client';

import { useState } from 'react';
import { Plus, LayoutPanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BoardFormDialog } from './BoardFormDialog';
import { useCreateBoard } from '@/hooks/useBoards';
import type { Board } from '@/lib/types';

interface BoardSidebarProps {
  boards: Board[];
  teamId: string;
  isAdmin: boolean;
  selectedBoardId: string | null;
  onSelect: (boardId: string) => void;
}

export function BoardSidebar({
  boards,
  teamId,
  isAdmin,
  selectedBoardId,
  onSelect,
}: BoardSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const { mutateAsync: createBoard, isPending } = useCreateBoard(teamId);

  return (
    <div className="flex flex-col gap-2 sm:w-56 sm:flex-shrink-0">
      <ul className="space-y-0.5">
        {boards.map((board) => {
          const isActive = board.id === selectedBoardId;
          return (
            <li key={board.id}>
              <button
                onClick={() => onSelect(board.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <LayoutPanelLeft className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{board.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Pano Ekle
        </Button>
      )}

      <BoardFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Yeni Pano"
        submitLabel="Oluştur"
        isPending={isPending}
        onSubmit={async (name) => {
          const { board } = await createBoard(name);
          setCreateOpen(false);
          onSelect(board.id);
        }}
      />
    </div>
  );
}
