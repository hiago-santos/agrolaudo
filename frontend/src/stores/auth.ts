import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ApiError, setAuthRefreshListener } from '@/lib/api';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  getRememberMe,
  setAccessToken,
  setRefreshToken,
} from '@/lib/authToken';
import { authService } from '@/services/auth';
import type { User } from '@/types/domain';

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  error: string | null;
  rememberMe: boolean;
  isAuthenticated: () => boolean;
  hasRole: (...roles: User['role'][]) => boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  hydrateFromSession: () => Promise<void>;
}

function applySession(session: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  rememberMe: boolean;
  user?: User;
}) {
  setAccessToken(session.accessToken, session.expiresIn);
  setRefreshToken(session.refreshToken, session.rememberMe);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      hydrated: false,
      error: null,
      rememberMe: getRememberMe(),

      isAuthenticated: () => !!get().user && (!!getAccessToken() || !!getRefreshToken()),
      hasRole: (...roles) => {
        const role = get().user?.role;
        return !!role && roles.includes(role);
      },

      login: async (email, password, rememberMe) => {
        set({ loading: true, error: null });
        try {
          const session = await authService.login(email, password, rememberMe);
          applySession(session);
          set({ user: session.user, rememberMe: session.rememberMe, loading: false });
          return true;
        } catch (e: unknown) {
          const message = e instanceof ApiError ? e.message : 'Falha ao entrar. Tente novamente.';
          clearAuthTokens();
          set({ error: message, loading: false, user: null });
          return false;
        }
      },

      logout: async () => {
        const refreshToken = getRefreshToken();
        try {
          await authService.logout(refreshToken);
        } finally {
          clearAuthTokens();
          set({ user: null, rememberMe: false });
        }
      },

      hydrateFromSession: async () => {
        set({ loading: true });
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearAuthTokens();
          set({ user: null, loading: false, hydrated: true, rememberMe: false });
          return;
        }

        try {
          // Troca o refresh por um access fresco (e rotaciona o refresh).
          const session = await authService.refresh(refreshToken);
          applySession(session);
          const user = session.user ?? (await authService.me());
          set({
            user,
            rememberMe: session.rememberMe,
            loading: false,
            hydrated: true,
          });
        } catch {
          clearAuthTokens();
          set({ user: null, loading: false, hydrated: true, rememberMe: false });
        }
      },
    }),
    {
      name: 'agrolaudo-auth',
      storage: createJSONStorage(() => localStorage),
      // Perfil só persiste com "lembrar-me"; tokens ficam em authToken.
      partialize: (state) => ({
        user: state.rememberMe ? state.user : null,
        rememberMe: state.rememberMe,
      }),
    },
  ),
);

// Mantém o store alinhado quando o api.ts renova a sessão em background.
setAuthRefreshListener((session) => {
  if (!session) {
    useAuthStore.setState({ user: null, rememberMe: false });
    return;
  }
  useAuthStore.setState({ rememberMe: session.rememberMe });
});
