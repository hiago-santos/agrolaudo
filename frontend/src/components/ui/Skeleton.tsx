import { cn } from '@/lib/cn';

/** Chaves estáveis para as linhas de placeholder (evita key por índice). */
function placeholderKeys(count: number, prefix: string): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const keys = placeholderKeys(lines, 'line');

  return (
    <div className={cn('space-y-2', className)}>
      {keys.map((key, index) => (
        <Skeleton key={key} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  const rowKeys = placeholderKeys(rows, 'row');
  const headKeys = placeholderKeys(columns, 'head');

  return (
    <div>
      <div className="flex gap-4 border-b border-border-strong px-4 py-3">
        {headKeys.map((key) => (
          <Skeleton key={key} className="h-3 flex-1" />
        ))}
      </div>
      {rowKeys.map((rowKey) => (
        <div key={rowKey} className="flex gap-4 border-b border-border px-4 py-3.5 last:border-0">
          {placeholderKeys(columns, `${rowKey}-cell`).map((cellKey, columnIndex) => (
            <Skeleton
              key={cellKey}
              className={cn('h-4 flex-1', columnIndex === 0 && 'max-w-[28%]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  const keys = placeholderKeys(count, 'card');

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {keys.map((key) => (
        <div key={key} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  const keys = placeholderKeys(rows, 'item');

  return (
    <ul>
      {keys.map((key) => (
        <li
          key={key}
          className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 last:border-0"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  const keys = placeholderKeys(fields, 'field');

  return (
    <div className="space-y-4">
      {keys.map((key) => (
        <div key={key} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
