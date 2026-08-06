import { useLayoutEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateCompact,
  shortPersonName,
} from '@/lib/format';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SHORT, PROJECT_STATUS_TONE } from '@/lib/projectStatus';
import type { ProjectStatus } from '@/types/domain';

/** Nome completo no desktop; só o primeiro nome no mobile (title com o completo). */
export function CompactName({ name, className }: { name: string; className?: string }) {
  const short = shortPersonName(name);
  return (
    <span className={className} title={name}>
      <span className="md:hidden">{short}</span>
      <span className="hidden md:inline">{name}</span>
    </span>
  );
}

/**
 * Moeda completa quando cabe; notação curta (R$ 13M) quando o espaço aperta.
 * Mede o host (`td`/`[data-compact-host]`/pai) via ResizeObserver.
 */
export function CompactCurrency({
  value,
  className,
}: {
  value: string | number | null | undefined;
  className?: string;
}) {
  const full = formatCurrency(value);
  const compact = formatCurrencyCompact(value);
  const rootRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  // Começa compacto pra não flashar reticências antes da medição.
  const [useCompact, setUseCompact] = useState(full !== compact);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;

    if (full === compact) {
      setUseCompact(false);
      return;
    }

    const host =
      root.closest<HTMLElement>('td, th, [data-compact-host]') ?? root.parentElement;
    if (!host) return;

    function update() {
      if (!host || !measure) return;
      const styles = getComputedStyle(host);
      const pad =
        (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
      const available = host.clientWidth - pad;
      // Folga de 1px evita oscilar na fronteira.
      setUseCompact(measure.offsetWidth > available - 1);
    }

    const observer = new ResizeObserver(update);
    observer.observe(host);
    update();
    return () => observer.disconnect();
  }, [full, compact]);

  return (
    <span ref={rootRef} className={cn('relative inline-block max-w-full', className)} title={full}>
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      >
        {full}
      </span>
      {useCompact ? compact : full}
    </span>
  );
}

/** Data completa no desktop; DD/MM/AA no mobile. */
export function CompactDate({
  value,
  className,
}: {
  value: string | Date | null | undefined;
  className?: string;
}) {
  const full = formatDate(value);
  return (
    <span className={className} title={full}>
      <span className="md:hidden">{formatDateCompact(value)}</span>
      <span className="hidden md:inline">{full}</span>
    </span>
  );
}

/** Badge de status com rótulo curto no mobile. */
export function CompactStatus({ status, className }: { status: ProjectStatus; className?: string }) {
  const full = PROJECT_STATUS_LABEL[status];
  return (
    <Badge tone={PROJECT_STATUS_TONE[status]} className={className} title={full}>
      <span className="md:hidden">{PROJECT_STATUS_SHORT[status]}</span>
      <span className="hidden md:inline">{full}</span>
    </Badge>
  );
}
