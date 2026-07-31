import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { BootScreen } from '@/components/ui/BootScreen';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const isAuth = useAuthStore((s) => s.authenticated);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) return <BootScreen />;
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

/** Bloqueia rotas de escrita para o perfil BANK (leitura + decisão pontual, ver plano). */
export function RequireRole({
  roles,
  children,
}: {
  roles: Array<'ADMIN' | 'AGRONOMIST' | 'BANK'>;
  children: ReactElement;
}) {
  const hasRole = useAuthStore((s) => s.hasRole(...roles));
  if (!hasRole) return <Navigate to="/" replace />;
  return children;
}
