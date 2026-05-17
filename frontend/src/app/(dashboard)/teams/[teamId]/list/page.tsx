'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Columns, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTasks } from '@/hooks/useTasks';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import { useTaskFilterStore } from '@/store/useTaskFilterStore';
import {
  createDefaultTeamListConfig,
  useListColumnsStore,
  type CustomColumnType,
  type ListColumn,
} from '@/store/useListColumnsStore';
import {
  AssigneeCell,
  CustomCell,
  DueDateCell,
  PriorityCell,
  StatusCell,
  TitleCell,
} from '@/components/tasks/list-cells';
import { cn, formatDate } from '@/lib/utils';
import type { Task } from '@/lib/types';

const CUSTOM_COLUMN_TYPES: Array<{ value: CustomColumnType; label: string }> = [
  { value: 'text', label: 'Metin' },
  { value: 'select', label: 'Seçim' },
  { value: 'date', label: 'Tarih' },
];

type ColumnDialogState =
  | { mode: 'add' }
  | { mode: 'edit'; column: ListColumn }
  | null;

function parseOptions(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((option) => option.trim())
        .filter(Boolean)
    )
  );
}

function ColumnsMenu({
  teamId,
  columns,
}: {
  teamId: string;
  columns: ListColumn[];
}) {
  const { setColumnVisible, resetTeam } = useListColumnsStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns className="mr-2 h-4 w-4" />
          Sütunlar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Görünür sütunlar
        </div>
        <div className="space-y-0.5">
          {columns.map((column) => (
            <label
              key={column.id}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                column.kind === 'builtin' && column.locked && 'cursor-not-allowed opacity-70'
              )}
            >
              <input
                type="checkbox"
                checked={column.visible}
                disabled={column.kind === 'builtin' && column.locked}
                onChange={() => setColumnVisible(teamId, column.id, !column.visible)}
                className="h-3.5 w-3.5 rounded border-input"
              />
              <span className="flex-1 truncate">{column.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-1 border-t border-border pt-1">
          <button
            type="button"
            onClick={() => resetTeam(teamId)}
            className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
          >
            Varsayılana dön
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColumnDialog({
  open,
  state,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  state: Exclude<ColumnDialogState, null>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { label: string; type: CustomColumnType; options: string[] }) => void;
}) {
  const editingColumn = state.mode === 'edit' ? state.column : null;
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomColumnType>('text');
  const [options, setOptions] = useState('');

  useEffect(() => {
    if (!open) return;

    if (editingColumn) {
      setLabel(editingColumn.label);
      setType(editingColumn.kind === 'custom' ? editingColumn.type : 'text');
      setOptions(editingColumn.kind === 'custom' ? (editingColumn.options ?? []).join(', ') : '');
      return;
    }

    setLabel('');
    setType('text');
    setOptions('');
  }, [editingColumn, open]);

  const isBuiltIn = editingColumn?.kind === 'builtin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state.mode === 'add' ? 'Yeni sütun ekle' : 'Sütunu düzenle'}</DialogTitle>
          <DialogDescription>
            {state.mode === 'add'
              ? 'Bu tabloya yeni bir özel sütun ekleyin.'
              : 'Sütun başlığını ve varsa özel seçeneklerini güncelleyin.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="column-label">Sütun adı</Label>
            <Input
              id="column-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Örn. Sprint"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="column-type">Sütun tipi</Label>
            <select
              id="column-type"
              value={type}
              disabled={isBuiltIn}
              onChange={(e) => setType(e.target.value as CustomColumnType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {CUSTOM_COLUMN_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isBuiltIn && (
              <p className="text-xs text-muted-foreground">
                Sistem sütunlarında tip sabit, sadece başlık düzenlenebilir.
              </p>
            )}
          </div>

          {type === 'select' && !isBuiltIn && (
            <div className="space-y-2">
              <Label htmlFor="column-options">Seçenekler</Label>
              <Input
                id="column-options"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Taslak, Bekliyor, Tamam"
              />
              <p className="text-xs text-muted-foreground">
                Virgül veya yeni satır ile birden fazla seçenek ekleyebilirsiniz.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onSubmit({ label, type, options: parseOptions(options) })}
          >
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColumnHeader({
  column,
  onEdit,
  onDelete,
}: {
  column: ListColumn;
  onEdit: (column: ListColumn) => void;
  onDelete: (column: ListColumn) => void;
}) {
  const canDelete = !(column.kind === 'builtin' && column.locked);
  const deleteLabel =
    column.kind === 'custom' ? `${column.label} sütununu sil` : `${column.label} sütununu gizle`;

  return (
    <th className="group px-4 py-3 text-left">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(column)}
          className="truncate text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {column.label}
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(column)}
            className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </th>
  );
}

export default function ListPage({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  useRealtimeTasks(teamId);

  const { data: tasks, isLoading } = useTasks(teamId);
  const { searchQuery, selectedStatuses, selectedPriorities } = useTaskFilterStore();
  const { teams, ensureTeam, addColumn, updateColumn, removeColumn, setCellValue } =
    useListColumnsStore();

  const [hydrated, setHydrated] = useState(false);
  const [dialogState, setDialogState] = useState<ColumnDialogState>(null);

  useEffect(() => {
    useListColumnsStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) ensureTeam(teamId);
  }, [ensureTeam, hydrated, teamId]);

  const config = hydrated ? teams[teamId] ?? createDefaultTeamListConfig() : createDefaultTeamListConfig();

  const filtered: Task[] = useMemo(
    () =>
      (tasks ?? []).filter((task) => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (selectedStatuses.length && !selectedStatuses.includes(task.status)) return false;
        if (selectedPriorities.length && !selectedPriorities.includes(task.priority)) return false;
        return true;
      }),
    [searchQuery, selectedPriorities, selectedStatuses, tasks]
  );

  const visibleColumns = config.columns.filter((column) => column.visible);

  const handleColumnSubmit = ({
    label,
    type,
    options,
  }: {
    label: string;
    type: CustomColumnType;
    options: string[];
  }) => {
    if (dialogState?.mode === 'edit') {
      updateColumn(teamId, dialogState.column.id, { label, type, options });
    } else {
      addColumn(teamId, { label, type, options });
    }

    setDialogState(null);
  };

  const handleDeleteColumn = (column: ListColumn) => {
    removeColumn(teamId, column.id);
  };

  const renderCell = (task: Task, column: ListColumn) => {
    if (column.kind === 'custom') {
      const value = config.values[task.id]?.[column.id] ?? null;

      return (
        <CustomCell
          column={column}
          value={value}
          onChange={(nextValue) => setCellValue(teamId, task.id, column.id, nextValue)}
        />
      );
    }

    switch (column.sourceKey) {
      case 'title':
        return <TitleCell task={task} teamId={teamId} />;
      case 'assignee':
        return <AssigneeCell task={task} teamId={teamId} />;
      case 'status':
        return <StatusCell task={task} teamId={teamId} />;
      case 'priority':
        return <PriorityCell task={task} teamId={teamId} />;
      case 'due_date':
        return <DueDateCell task={task} teamId={teamId} />;
      case 'created_at':
        return <span className="text-xs text-muted-foreground">{formatDate(task.created_at)}</span>;
      case 'updated_at':
        return <span className="text-xs text-muted-foreground">{formatDate(task.updated_at)}</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} görev</p>
          <div className="flex items-center gap-2">
            {hydrated && <ColumnsMenu teamId={teamId} columns={config.columns} />}
            <Button variant="outline" size="sm" onClick={() => setDialogState({ mode: 'add' })}>
              <Plus className="mr-2 h-4 w-4" />
              Sütun Ekle
            </Button>
            <Button asChild size="sm">
              <Link href={`/teams/${teamId}/tasks/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Görev
              </Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {isLoading && (
            <div className="divide-y">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="ml-auto h-6 w-20" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Görev bulunamadı.</div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-gray-50 text-xs font-medium text-muted-foreground">
                  <tr>
                    {visibleColumns.map((column) => (
                      <ColumnHeader
                        key={column.id}
                        column={column}
                        onEdit={(nextColumn) => setDialogState({ mode: 'edit', column: nextColumn })}
                        onDelete={handleDeleteColumn}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((task) => (
                    <tr key={task.id} className="transition-colors hover:bg-gray-50/60">
                      {visibleColumns.map((column) => (
                        <td key={`${task.id}-${column.id}`} className="px-4 py-2.5 align-middle">
                          {renderCell(task, column)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {dialogState && (
        <ColumnDialog
          open={!!dialogState}
          state={dialogState}
          onOpenChange={(open) => {
            if (!open) setDialogState(null);
          }}
          onSubmit={handleColumnSubmit}
        />
      )}
    </>
  );
}
