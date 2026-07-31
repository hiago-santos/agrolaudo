import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth';

/** Restaura a sessão (refresh) uma vez após o persist do Zustand. */
export function useAuthGuard(): void {
  const hydrateFromSession = useAuthStore((s) => s.hydrateFromSession);

  useEffect(() => {
    const run = () => {
      void hydrateFromSession();
    };

    const unsub = useAuthStore.persist.onFinishHydration(run);
    if (useAuthStore.persist.hasHydrated()) run();

    return unsub;
  }, [hydrateFromSession]);
}
