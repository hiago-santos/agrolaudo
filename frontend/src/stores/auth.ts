import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ApiError } from '@/lib/api';
import { authService } from '@/services/auth';
import type { User } from '@/types/domain';

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  error: string | null;
  isAuthenticated: () => boolean;
  hasRole: (...roles: User['role'][]) => boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hydrateFromSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      hydrated: false,
      error: null,

      isAuthenticated: () => !!get().user,
      hasRole: (...roles) => {
        const role = get().user?.role;
        return !!role && roles.includes(role);
      },

      login: async (email, senha) => {
        set({ loading: true, error: null });
        try {
          const { user } = await authService.login(email, senha);
          set({ user, loading: false });
          return true;
        } catch (e: unknown) {
          const message = e instanceof ApiError ? e.message : 'Falha ao entrar. Tente novamente.';
          set({ error: message, loading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          set({ user: null });
        }
      },

      hydrateFromSession: async () => {
        set({ loading: true });
        const user = await authService.me().catch(() => null);
        set({ user, loading: false, hydrated: true });
      },
    }),
    {
      name: 'agrolaudo-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
