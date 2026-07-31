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
  /** Espelho reativo da sessão (tokens ficam fora do Zustand). */
  authenticated: boolean;
  error: string | null;
  rememberMe: boolean;
  isAuthenticated: () => boolean;
  hasRole: (...roles: User['role'][]) => boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  hydrateFromSession: () => Promise<void>;
}

/** Invalida hydrates/refreshes em voo quando login/logout cria uma sessão nova. */
let sessionEpoch = 0;
let hydratePromise: Promise<void> | null = null;

function applySession(session: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  rememberMe: boolean;
}) {
  setAccessToken(session.accessToken, session.expiresIn);
  setRefreshToken(session.refreshToken, session.rememberMe);
}

function syncAuthenticated(): boolean {
  const user = useAuthStore.getState().user;
  return !!user && (!!getAccessToken() || !!getRefreshToken());
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      hydrated: false,
      authenticated: false,
      error: null,
      rememberMe: getRememberMe(),

      isAuthenticated: () => get().authenticated,
      hasRole: (...roles) => {
        const role = get().user?.role;
        return !!role && roles.includes(role);
      },

      login: async (email, password, rememberMe) => {
        const epoch = ++sessionEpoch;
        set({ loading: true, error: null });
        try {
          const session = await authService.login(email, password, rememberMe);
          if (epoch !== sessionEpoch) return false;
          applySession(session);
          set({
            user: session.user,
            rememberMe: session.rememberMe,
            loading: false,
            hydrated: true,
            authenticated: true,
            error: null,
          });
          return true;
        } catch (e: unknown) {
          if (epoch !== sessionEpoch) return false;
          const message = e instanceof ApiError ? e.message : 'Falha ao entrar. Tente novamente.';
          clearAuthTokens();
          set({
            error: message,
            loading: false,
            user: null,
            authenticated: false,
            hydrated: true,
          });
          return false;
        }
      },

      logout: async () => {
        sessionEpoch += 1;
        const refreshToken = getRefreshToken();
        try {
          await authService.logout(refreshToken);
        } finally {
          clearAuthTokens();
          set({ user: null, rememberMe: false, authenticated: false });
        }
      },

      hydrateFromSession: async () => {
        if (hydratePromise) return hydratePromise;

        hydratePromise = (async () => {
          const epoch = ++sessionEpoch;
          set({ loading: true });
          const refreshToken = getRefreshToken();

          if (!refreshToken) {
            if (epoch !== sessionEpoch) return;
            clearAuthTokens();
            set({
              user: null,
              loading: false,
              hydrated: true,
              rememberMe: false,
              authenticated: false,
            });
            return;
          }

          try {
            const session = await authService.refresh(refreshToken);
            if (epoch !== sessionEpoch) return;
            applySession(session);
            const user = session.user ?? (await authService.me());
            if (epoch !== sessionEpoch) return;
            set({
              user,
              rememberMe: session.rememberMe,
              loading: false,
              hydrated: true,
              authenticated: true,
            });
          } catch {
            // Só limpa se esta tentativa ainda for a sessão atual
            // (evita apagar um login que acabou de vencer o hydrate).
            if (epoch !== sessionEpoch) return;
            if (getRefreshToken() !== refreshToken) {
              set({
                loading: false,
                hydrated: true,
                authenticated: syncAuthenticated(),
              });
              return;
            }
            clearAuthTokens();
            set({
              user: null,
              loading: false,
              hydrated: true,
              rememberMe: false,
              authenticated: false,
            });
          }
        })().finally(() => {
          hydratePromise = null;
        });

        return hydratePromise;
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Após rehydrate do persist, ainda precisamos do refresh HTTP.
        // authenticated fica false até hydrateFromSession concluir.
        state.authenticated = false;
      },
    },
  ),
);

// Mantém o store alinhado quando o api.ts renova a sessão em background.
setAuthRefreshListener((session) => {
  if (!session) {
    useAuthStore.setState({ user: null, rememberMe: false, authenticated: false });
    return;
  }
  useAuthStore.setState({
    rememberMe: session.rememberMe,
    authenticated: syncAuthenticated() || !!getAccessToken() || !!getRefreshToken(),
  });
});
