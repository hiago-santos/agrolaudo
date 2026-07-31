import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  leaving?: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const EXIT_MS = 140;
const AUTO_DISMISS_MS = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().dismiss(id);
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) => {
    const current = get().toasts.find((t) => t.id === id);
    if (!current || current.leaving) return;

    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, EXIT_MS);
  },
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ variant: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ variant: 'error', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ variant: 'info', title, description }),
};
