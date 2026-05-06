import { create } from 'zustand';
import type { TaskStatus, TaskPriority } from '@/lib/types';

interface TaskFilterState {
  selectedStatuses: TaskStatus[];
  selectedPriorities: TaskPriority[];
  selectedAssignees: string[];
  searchQuery: string;
  sortBy: 'created_at' | 'due_date' | 'priority';
  setSelectedStatuses: (statuses: TaskStatus[]) => void;
  setSelectedPriorities: (priorities: TaskPriority[]) => void;
  setSelectedAssignees: (assignees: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: TaskFilterState['sortBy']) => void;
  resetFilters: () => void;
}

const initialState = {
  selectedStatuses: [] as TaskStatus[],
  selectedPriorities: [] as TaskPriority[],
  selectedAssignees: [] as string[],
  searchQuery: '',
  sortBy: 'created_at' as const,
};

export const useTaskFilterStore = create<TaskFilterState>((set) => ({
  ...initialState,
  setSelectedStatuses: (statuses) => set({ selectedStatuses: statuses }),
  setSelectedPriorities: (priorities) => set({ selectedPriorities: priorities }),
  setSelectedAssignees: (assignees) => set({ selectedAssignees: assignees }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  resetFilters: () => set(initialState),
}));
