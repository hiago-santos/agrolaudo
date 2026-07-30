import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ApiError } from '@/lib/api';
import { setAccessToken } from '@/lib/authToken';
import { authService } from '@/services/auth';
import type { User } from '@/types/domain';

interface AuthState {
  user: User | null;
  token: string | null;
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
      token: null,
      loading: false,
      hydrated: false,
      error: null,

      isAuthenticated: () => !!get().user && !!get().token,
      hasRole: (...roles) => {
        const role = get().user?.role;
        return !!role && roles.includes(role);
      },

      login: async (email, senha) => {
        set({ loading: true, error: null });
        try {
          const { user, token } = await authService.login(email, senha);
          setAccessToken(token);
          set({ user, token, loading: false });
          return true;
        } catch (e: unknown) {
          const message = e instanceof ApiError ? e.message : 'Falha ao entrar. Tente novamente.';
          setAccessToken(null);
          set({ error: message, loading: false, user: null, token: null });
          return false;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } finally {
          setAccessToken(null);
          set({ user: null, token: null });
        }
      },

      hydrateFromSession: async () => {
        set({ loading: true });
        // Restaura Bearer do persist antes do /me (cookie sozinho pode não ir).
        setAccessToken(get().token);
        if (!get().token) {
          set({ user: null, loading: false, hydrated: true });
          return;
        }
        const user = await authService.me().catch(() => null);
        if (!user) {
          setAccessToken(null);
          set({ user: null, token: null, loading: false, hydrated: true });
          return;
        }
        set({ user, loading: false, hydrated: true });
      },
    }),
    {
      name: 'agrolaudo-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAccessToken(state.token);
      },
    },
  ),
);
