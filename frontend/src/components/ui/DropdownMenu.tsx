import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

const DropdownMenuContext = createContext<() => void>(() => {});

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  triggerClassName?: string;
  menuClassName?: string;
  label?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  triggerClassName,
  menuClassName,
  label,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const items = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      if (items.length === 0) return;
      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + offset + items.length) % items.length;
      items[nextIndex]?.focus();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center gap-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring',
          triggerClassName,
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-2 min-w-48 rounded-lg border border-border bg-surface p-1',
            'animate-menu-in shadow-lg shadow-black/5',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            menuClassName,
          )}
        >
          <DropdownMenuContext.Provider value={() => setOpen(false)}>
            {children}
          </DropdownMenuContext.Provider>
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  onSelect: () => void;
  children: ReactNode;
  tone?: 'default' | 'danger';
  icon?: ReactNode;
}

export function DropdownMenuItem({
  onSelect,
  children,
  tone = 'default',
  icon,
}: DropdownMenuItemProps) {
  const close = useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        close();
        onSelect();
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring',
        tone === 'danger'
          ? 'text-text-secondary hover:bg-danger-soft hover:text-danger focus-visible:text-danger'
          : 'text-text-secondary hover:bg-bg-subtle hover:text-text',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
      {children}
    </p>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
