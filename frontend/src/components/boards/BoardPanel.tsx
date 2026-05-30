'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { BoardItemRow } from './BoardItemRow';
import { BoardItemForm } from './BoardItemForm';
import { BoardFormDialog } from './BoardFormDialog';
import { useCreateBoardItem, useRenameBoard, useDeleteBoard } from '@/hooks/useBoards';
import type { Board } from '@/lib/types';

interface BoardPanelProps {
  board: Board;
  teamId: string;
  isAdmin: boolean;
  onDeleted: () => void;
}

export function BoardPanel({ board, teamId, isAdmin, onDeleted }: BoardPanelProps) {
  const [adding, setAdding] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const { mutateAsync: createItem, isPending: isCreating } = useCreateBoardItem(teamId);
  const { mutateAsync: renameBoard, isPending: isRenaming } = useRenameBoard(teamId);
  const { mutate: deleteBoard, isPending: isDeleting } = useDeleteBoard(teamId);

  const items = board.board_items ?? [];

  const handleDelete = () => {
    if (!window.confirm(`"${board.name}" panosu ve tüm içeriği silinecek. Emin misiniz?`)) return;
    deleteBoard(board.id, { onSuccess: onDeleted });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 truncate text-lg font-semibold">{board.name}</h2>
        {isAdmin && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setRenameOpen(true)}
              aria-label="Panoyu yeniden adlandır"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
              onClick={handleDelete}
              aria-label="Panoyu sil"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <BoardItemRow key={item.id} item={item} teamId={teamId} boardId={board.id} />
        ))}

        {items.length === 0 && !adding && (
          <EmptyState
            icon={Inbox}
            title="Bu pano boş"
            description="Link, şifre veya not ekleyerek başlayın."
            action={{ label: 'İçerik Ekle', onClick: () => setAdding(true) }}
          />
        )}
      </div>

      {adding ? (
        <BoardItemForm
          isPending={isCreating}
          onSubmit={async (values) => {
            await createItem({ boardId: board.id, values });
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        items.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            İçerik Ekle
          </Button>
        )
      )}

      <BoardFormDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialName={board.name}
        title="Panoyu Yeniden Adlandır"
        submitLabel="Kaydet"
        isPending={isRenaming}
        onSubmit={async (name) => {
          await renameBoard({ boardId: board.id, name });
          setRenameOpen(false);
        }}
      />
    </div>
  );
}
