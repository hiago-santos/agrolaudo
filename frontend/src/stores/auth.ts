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
  refreshToken: string;
  expiresIn: number;
  rememberMe: boolean;
}) {
  setAccessToken(session.accessToken, session.expiresIn);
  setRefreshToken(session.refreshToken, session.rememberMe);
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

          // Já logado com access válido — só marca hydrated.
          if (get().user && getAccessToken() && !accessTokenNeedsRefresh()) {
            if (epoch !== sessionEpoch) return;
            set({ loading: false, hydrated: true, authenticated: true });
            return;
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
      partialize: (state) => ({
        user: state.rememberMe ? state.user : null,
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
