'use client';

import { useState } from 'react';
import { Link2, KeyRound, StickyNote, Eye, EyeOff, Copy, Check, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BoardItemForm } from './BoardItemForm';
import { useUpdateBoardItem, useDeleteBoardItem } from '@/hooks/useBoards';
import type { BoardItem, BoardItemType } from '@/lib/types';

const TYPE_ICON: Record<BoardItemType, typeof Link2> = {
  link: Link2,
  password: KeyRound,
  note: StickyNote,
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} kopyalandı`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground"
      onClick={handleCopy}
      aria-label={`${label} kopyala`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function ItemValue({ item }: { item: BoardItem }) {
  const [revealed, setRevealed] = useState(false);

  if (item.type === 'link') {
    return (
      <a
        href={item.value}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate text-sm text-primary hover:underline"
      >
        {item.value}
      </a>
    );
  }

  if (item.type === 'password') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="truncate font-mono text-sm text-foreground">
          {revealed ? item.value : '••••••••••'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => setRevealed((value) => !value)}
          aria-label={revealed ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words text-sm text-foreground">{item.value}</p>;
}

interface BoardItemRowProps {
  item: BoardItem;
  teamId: string;
  boardId: string;
}

export function BoardItemRow({ item, teamId, boardId }: BoardItemRowProps) {
  const [editing, setEditing] = useState(false);
  const { mutateAsync: updateItem, isPending: isUpdating } = useUpdateBoardItem(teamId);
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteBoardItem(teamId);

  const Icon = TYPE_ICON[item.type];

  if (editing) {
    return (
      <BoardItemForm
        item={item}
        isPending={isUpdating}
        onSubmit={async (values) => {
          await updateItem({ boardId, itemId: item.id, values });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-white p-3">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        {item.label && <p className="truncate text-sm font-medium text-foreground">{item.label}</p>}
        <ItemValue item={item} />
      </div>

      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {item.type !== 'note' && (
          <CopyButton value={item.value} label={item.type === 'password' ? 'Şifre' : 'Link'} />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => setEditing(true)}
          aria-label="Düzenle"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={isDeleting}
          onClick={() => deleteItem({ boardId, itemId: item.id })}
          aria-label="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
