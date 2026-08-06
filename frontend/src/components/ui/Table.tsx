import type {
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /**
   * Só use quando a tabela realmente precisa de scroll (muitas colunas editáveis).
   * Por padrão a tabela encolhe e truncа o conteúdo dentro da largura disponível.
   */
  scrollable?: boolean;
}

export function Table({ className, scrollable = false, ...props }: TableProps) {
  return (
    <div className={cn('w-full', scrollable ? 'overflow-x-auto' : 'overflow-hidden')}>
      <table
        className={cn(
          'w-full border-collapse text-sm',
          scrollable ? 'min-w-max' : 'table-fixed',
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border-strong', className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Torna a linha inteira clicável — navega pra esta rota. */
  to?: string;
}

export function TableRow({ className, to, onClick, onKeyDown, ...props }: TableRowProps) {
  if (to) {
    return (
      <ClickableTableRow
        to={to}
        className={className}
        onClick={onClick}
        onKeyDown={onKeyDown}
        {...props}
      />
    );
  }

  return (
    <tr
      className={cn(
        'border-b border-border last:border-0 transition-colors hover:bg-bg-subtle/60',
        className,
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...props}
    />
  );
}

function ClickableTableRow({
  to,
  className,
  onClick,
  onKeyDown,
  ...props
}: TableRowProps & { to: string }) {
  const navigate = useNavigate();

  function go(event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea, label, [role="menuitem"]')) return;
    onClick?.(event as MouseEvent<HTMLTableRowElement>);
    if (event.defaultPrevented) return;
    navigate(to);
  }

  return (
    <tr
      role="link"
      tabIndex={0}
      className={cn(
        'cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-bg-subtle/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ring',
        className,
      )}
      onClick={go}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          go(event);
        }
      }}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'overflow-hidden text-ellipsis px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary',
        'sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-wider',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-text sm:px-4 sm:py-3',
        className,
      )}
      {...props}
    />
  );
}

export function TableCellNumeric({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 font-mono text-sm tabular-nums text-text sm:px-4 sm:py-3',
        className,
      )}
      {...props}
    />
  );
}
