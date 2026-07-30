import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth';

/** Restaura o Bearer do persist e confere a sessão com o servidor ao montar. */
export function useAuthGuard(): void {
  const hydrateFromSession = useAuthStore((s) => s.hydrateFromSession);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (!cancelled) void hydrateFromSession();
    };

    const unsub = useAuthStore.persist.onFinishHydration(run);
    if (useAuthStore.persist.hasHydrated()) run();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [hydrateFromSession]);
}
