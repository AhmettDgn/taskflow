'use client';

import { useState } from 'react';
import { Check, ListChecks, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAddSubtask, useDeleteSubtask, useToggleSubtask } from '@/hooks/useSubtasks';
import type { Subtask } from '@/lib/types';

interface SubtaskChecklistProps {
  teamId: string;
  taskId: string;
  subtasks: Subtask[];
}

export function SubtaskChecklist({ teamId, taskId, subtasks }: SubtaskChecklistProps) {
  const [draft, setDraft] = useState('');
  const { mutate: addSubtask, isPending: isAdding } = useAddSubtask(teamId);
  const { mutate: toggleSubtask } = useToggleSubtask(teamId);
  const { mutate: deleteSubtask } = useDeleteSubtask(teamId);

  const ordered = [...subtasks].sort((a, b) => a.position - b.position);
  const doneCount = ordered.filter((subtask) => subtask.is_done).length;
  const progress = ordered.length > 0 ? Math.round((doneCount / ordered.length) * 100) : 0;

  const handleAdd = () => {
    const title = draft.trim();
    if (!title) return;
    addSubtask({ taskId, title });
    setDraft('');
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
          Alt Görevler
        </p>
        {ordered.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground" data-testid="subtask-progress">
            {doneCount}/{ordered.length}
          </span>
        )}
      </div>

      {ordered.length > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              progress === 100 ? 'bg-emerald-500' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <ul className="space-y-1">
        {ordered.map((subtask) => (
          <li
            key={subtask.id}
            className="group flex items-center gap-2.5 rounded-md px-1 py-1.5 transition-colors hover:bg-gray-50"
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={subtask.is_done}
              onClick={() => toggleSubtask(subtask)}
              className={cn(
                'flex h-4.5 w-4.5 h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border transition-colors',
                subtask.is_done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-input bg-white hover:border-primary'
              )}
              data-testid="subtask-checkbox"
            >
              {subtask.is_done && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <span
              className={cn(
                'flex-1 truncate text-sm',
                subtask.is_done && 'text-muted-foreground line-through'
              )}
            >
              {subtask.title}
            </span>
            <button
              type="button"
              onClick={() => deleteSubtask(subtask)}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label={`${subtask.title} alt görevini sil`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className={cn('flex gap-2', ordered.length > 0 && 'mt-2')}>
        <Input
          placeholder="Alt görev ekle..."
          value={draft}
          disabled={isAdding}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="h-8 text-sm"
          data-testid="subtask-add-input"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={isAdding || !draft.trim()}
          aria-label="Alt görev ekle"
          className="h-8 w-8 flex-shrink-0"
        >
          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
