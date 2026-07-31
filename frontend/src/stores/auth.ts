import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ApiError, refreshSession, setAuthRefreshListener } from '@/lib/api';
import {
  accessTokenNeedsRefresh,
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
  /** Espelho reativo da sessão (tokens ficam em authToken). */
  authenticated: boolean;
  error: string | null;
  rememberMe: boolean;
  isAuthenticated: () => boolean;
  hasRole: (...roles: User['role'][]) => boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  hydrateFromSession: () => Promise<void>;
}

/** Incrementado só em login/logout para cancelar hydrates obsoletos. */
let sessionEpoch = 0;
let hydratePromise: Promise<void> | null = null;

function applySession(session: {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  rememberMe: boolean;
}) {
  if (session.refreshToken) {
    setRefreshToken(session.refreshToken, session.rememberMe);
  } else {
    setRefreshToken(null, session.rememberMe);
  }
  setAccessToken(session.accessToken, session.expiresIn);
}

function hasLiveSession(): boolean {
  return !!getAccessToken() || !!getRefreshToken();
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
        set({ loading: true, error: null });
        try {
          const session = await authService.login(email, password, rememberMe);
          // Invalida hydrates em voo só depois do sucesso — nunca descarta o login.
          sessionEpoch += 1;
          applySession(session);

          // Sem Bearer gravado, não marca sessão — evita “logado” com requests sem Authorization.
          if (!getAccessToken()) {
            clearAuthTokens();
            set({
              error: 'Não foi possível gravar a sessão. Tente novamente.',
              loading: false,
              user: null,
              authenticated: false,
              hydrated: true,
            });
            return false;
          }

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
          const epoch = sessionEpoch;
          set({ loading: true });

          // Access token ainda válido — evita girar o refresh (uso único) à toa
          // a cada reload. Só busca o usuário se ele não estiver em cache.
          if (getAccessToken() && !accessTokenNeedsRefresh()) {
            if (get().user) {
              if (epoch !== sessionEpoch) return;
              set({ loading: false, hydrated: true, authenticated: true });
              return;
            }
            try {
              const user = await authService.me();
              if (epoch !== sessionEpoch) return;
              set({ user, loading: false, hydrated: true, authenticated: true });
              return;
            } catch {
              // Access token "válido" localmente mas rejeitado pelo servidor — cai pro refresh abaixo.
            }
          }

          const refreshToken = getRefreshToken();
          if (!refreshToken) {
            if (epoch !== sessionEpoch) return;
            // Não apaga tokens que um login acabou de gravar.
            if (hasLiveSession()) {
              set({
                loading: false,
                hydrated: true,
                authenticated: !!get().user && hasLiveSession(),
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
            return;
          }

          try {
            const session = await refreshSession();
            if (epoch !== sessionEpoch) return;

            if (!session) {
              // Pode ter perdido uma corrida de rotação (outra aba já girou o
              // token). Reconfere o que estiver em storage agora antes de deslogar.
              if (getAccessToken() && !accessTokenNeedsRefresh()) {
                try {
                  const user = get().user ?? (await authService.me());
                  if (epoch !== sessionEpoch) return;
                  set({ user, loading: false, hydrated: true, authenticated: true });
                  return;
                } catch {
                  // segue pro fallback abaixo
                }
              }
              if (hasLiveSession() && get().user) {
                set({ loading: false, hydrated: true, authenticated: true });
                return;
              }
              set({
                user: null,
                loading: false,
                hydrated: true,
                rememberMe: false,
                authenticated: false,
              });
              return;
            }

            const user =
              (session.user as User | undefined) ?? get().user ?? (await authService.me());
            if (epoch !== sessionEpoch) return;

            set({
              user,
              rememberMe: session.rememberMe,
              loading: false,
              hydrated: true,
              authenticated: true,
            });
          } catch {
            if (epoch !== sessionEpoch) return;
            if (hasLiveSession() && get().user) {
              set({ loading: false, hydrated: true, authenticated: true });
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
      // Os tokens já ficam em localStorage independente do "lembrar-me" (esse
      // só define o TTL do refresh no servidor) — então cachear o user também
      // evita girar o refresh token (uso único) sem necessidade a cada reload.
      partialize: (state) => ({
        user: state.user,
        rememberMe: state.rememberMe,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.authenticated = false;
      },
    },
  ),
);

setAuthRefreshListener((session) => {
  if (!session) {
    useAuthStore.setState({ user: null, rememberMe: false, authenticated: false });
    return;
  }
  const user = (session.user as User | undefined) ?? useAuthStore.getState().user;
  useAuthStore.setState({
    rememberMe: session.rememberMe,
    user: user ?? useAuthStore.getState().user,
    authenticated: !!user && hasLiveSession(),
  });
});
