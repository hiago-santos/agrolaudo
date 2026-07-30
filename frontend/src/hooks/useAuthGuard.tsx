import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth';

/** Confere a sessão com o servidor uma vez ao montar o app (cookie httpOnly). */
export function useAuthGuard(): void {
  const hydrateFromSession = useAuthStore((s) => s.hydrateFromSession);

  useEffect(() => {
    void hydrateFromSession();
  }, [hydrateFromSession]);
}
