import { create } from 'zustand';

interface TaskPanelState {
  /** ID of the task whose detail panel is open, or null when closed. */
  openTaskId: string | null;
  openTask: (taskId: string) => void;
  close: () => void;
}

export const useTaskPanelStore = create<TaskPanelState>((set) => ({
  openTaskId: null,
  openTask: (taskId) => set({ openTaskId: taskId }),
  close: () => set({ openTaskId: null }),
}));
