import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BuiltInColumnKey =
  | 'title'
  | 'assignee'
  | 'status'
  | 'priority'
  | 'due_date'
  | 'created_at'
  | 'updated_at';

export type CustomColumnType = 'text' | 'select' | 'date';

export interface BuiltInListColumn {
  id: BuiltInColumnKey;
  kind: 'builtin';
  sourceKey: BuiltInColumnKey;
  type: BuiltInColumnKey;
  label: string;
  visible: boolean;
  locked?: boolean;
}

export interface CustomListColumn {
  id: string;
  kind: 'custom';
  type: CustomColumnType;
  label: string;
  visible: boolean;
  options?: string[];
}

export type ListColumn = BuiltInListColumn | CustomListColumn;

export interface TeamListConfig {
  columns: ListColumn[];
  values: Record<string, Record<string, string | null>>;
}

interface AddCustomColumnInput {
  label: string;
  type: CustomColumnType;
  options?: string[];
}

interface UpdateColumnInput {
  label?: string;
  type?: CustomColumnType;
  options?: string[];
  visible?: boolean;
}

interface ListColumnsState {
  teams: Record<string, TeamListConfig>;
  ensureTeam: (teamId: string) => void;
  setColumnVisible: (teamId: string, columnId: string, value: boolean) => void;
  addColumn: (teamId: string, input: AddCustomColumnInput) => string;
  updateColumn: (teamId: string, columnId: string, updates: UpdateColumnInput) => void;
  removeColumn: (teamId: string, columnId: string) => void;
  setCellValue: (teamId: string, taskId: string, columnId: string, value: string | null) => void;
  resetTeam: (teamId: string) => void;
}

const BUILTIN_COLUMNS: Array<{
  id: BuiltInColumnKey;
  label: string;
  visible: boolean;
  locked?: boolean;
}> = [
  { id: 'title', label: 'Başlık', visible: true, locked: true },
  { id: 'assignee', label: 'Atanan', visible: true, locked: true },
  { id: 'status', label: 'Durum', visible: true },
  { id: 'priority', label: 'Öncelik', visible: true },
  { id: 'due_date', label: 'Vade', visible: true },
  { id: 'created_at', label: 'Oluşturuldu', visible: false },
  { id: 'updated_at', label: 'Güncellendi', visible: false },
];

const DEFAULT_TEAM_CONFIG = (): TeamListConfig => ({
  columns: BUILTIN_COLUMNS.map((column) => ({
    id: column.id,
    kind: 'builtin',
    sourceKey: column.id,
    type: column.id,
    label: column.label,
    visible: column.visible,
    locked: column.locked,
  })),
  values: {},
});

const getTeamConfig = (state: ListColumnsState, teamId: string) =>
  state.teams[teamId] ?? DEFAULT_TEAM_CONFIG();

const sanitizeLabel = (label?: string) => label?.trim() || 'Yeni Sütun';

const sanitizeOptions = (options?: string[]) =>
  Array.from(new Set((options ?? []).map((option) => option.trim()).filter(Boolean)));

export function createDefaultTeamListConfig() {
  return DEFAULT_TEAM_CONFIG();
}

export const useListColumnsStore = create<ListColumnsState>()(
  persist(
    (set) => ({
      teams: {},

      ensureTeam: (teamId) =>
        set((state) => {
          if (state.teams[teamId]) return state;
          return { teams: { ...state.teams, [teamId]: DEFAULT_TEAM_CONFIG() } };
        }),

      setColumnVisible: (teamId, columnId, value) =>
        set((state) => {
          const config = getTeamConfig(state, teamId);
          return {
            teams: {
              ...state.teams,
              [teamId]: {
                ...config,
                columns: config.columns.map((column) => {
                  if (column.id !== columnId) return column;
                  if (column.kind === 'builtin' && column.locked) return column;
                  return { ...column, visible: value };
                }),
              },
            },
          };
        }),

      addColumn: (teamId, input) => {
        const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => {
          const config = getTeamConfig(state, teamId);
          const nextColumn: CustomListColumn = {
            id,
            kind: 'custom',
            type: input.type,
            label: sanitizeLabel(input.label),
            visible: true,
            options: input.type === 'select' ? sanitizeOptions(input.options) : undefined,
          };

          return {
            teams: {
              ...state.teams,
              [teamId]: {
                ...config,
                columns: [...config.columns, nextColumn],
              },
            },
          };
        });
        return id;
      },

      updateColumn: (teamId, columnId, updates) =>
        set((state) => {
          const config = getTeamConfig(state, teamId);
          return {
            teams: {
              ...state.teams,
              [teamId]: {
                ...config,
                columns: config.columns.map((column) => {
                  if (column.id !== columnId) return column;

                  if (column.kind === 'builtin') {
                    return {
                      ...column,
                      label: sanitizeLabel(updates.label ?? column.label),
                      visible:
                        typeof updates.visible === 'boolean' && !column.locked
                          ? updates.visible
                          : column.visible,
                    };
                  }

                  const nextType = updates.type ?? column.type;
                  return {
                    ...column,
                    label: sanitizeLabel(updates.label ?? column.label),
                    type: nextType,
                    visible: updates.visible ?? column.visible,
                    options:
                      nextType === 'select'
                        ? sanitizeOptions(updates.options ?? column.options)
                        : undefined,
                  };
                }),
              },
            },
          };
        }),

      removeColumn: (teamId, columnId) =>
        set((state) => {
          const config = getTeamConfig(state, teamId);
          const target = config.columns.find((column) => column.id === columnId);

          if (!target) return state;

          if (target.kind === 'builtin') {
            if (target.locked) return state;
            return {
              teams: {
                ...state.teams,
                [teamId]: {
                  ...config,
                  columns: config.columns.map((column) =>
                    column.id === columnId ? { ...column, visible: false } : column
                  ),
                },
              },
            };
          }

          const nextValues = Object.fromEntries(
            Object.entries(config.values).map(([taskId, rowValues]) => [
              taskId,
              Object.fromEntries(
                Object.entries(rowValues).filter(([storedColumnId]) => storedColumnId !== columnId)
              ),
            ])
          );

          return {
            teams: {
              ...state.teams,
              [teamId]: {
                columns: config.columns.filter((column) => column.id !== columnId),
                values: nextValues,
              },
            },
          };
        }),

      setCellValue: (teamId, taskId, columnId, value) =>
        set((state) => {
          const config = getTeamConfig(state, teamId);
          const row = config.values[taskId] ?? {};
          return {
            teams: {
              ...state.teams,
              [teamId]: {
                ...config,
                values: {
                  ...config.values,
                  [taskId]: {
                    ...row,
                    [columnId]: value,
                  },
                },
              },
            },
          };
        }),

      resetTeam: (teamId) =>
        set((state) => ({
          teams: {
            ...state.teams,
            [teamId]: DEFAULT_TEAM_CONFIG(),
          },
        })),
    }),
    {
      name: 'taskflow-list-columns',
      skipHydration: true,
    }
  )
);
