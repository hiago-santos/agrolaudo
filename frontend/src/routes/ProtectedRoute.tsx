import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { PageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) return <PageSpinner />;
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

/** Bloqueia rotas de escrita para o perfil BANCO (somente leitura, ver plano). */
export function RequireRole({
  roles,
  children,
}: {
  roles: Array<'ADMIN' | 'AGRONOMO' | 'BANCO'>;
  children: ReactElement;
}) {
  const hasRole = useAuthStore((s) => s.hasRole(...roles));
  if (!hasRole) return <Navigate to="/" replace />;
  return children;
}
