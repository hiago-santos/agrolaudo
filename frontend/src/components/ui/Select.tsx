import { Check, ChevronDown } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: ReactNode;
  /** Texto usado na busca por teclado e no valor exibido do trigger. */
  searchLabel?: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  /** Classes no wrapper (largura, etc.). */
  containerClassName?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

function optionText(option: SelectOption): string {
  if (option.searchLabel) return option.searchLabel;
  if (typeof option.label === 'string') return option.label;
  return String(option.value);
}

export function Select({
  id,
  name,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Selecione',
  disabled = false,
  size = 'md',
  className,
  containerClassName,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);
  const selectableIndexes = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  function close() {
    setOpen(false);
    setHighlighted(-1);
  }

  function openMenu() {
    if (disabled) return;
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setHighlighted(selectedIndex >= 0 ? selectedIndex : (selectableIndexes[0] ?? -1));
    setOpen(true);
  }

  function choose(next: string) {
    onChange(next);
    close();
    triggerRef.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function position() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const maxHeight = 264;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);

      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: Math.max(rect.width, 160),
        maxHeight: height,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    }

    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
      onBlur?.();
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onBlur]);

  useEffect(() => {
    if (!open || highlighted < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, highlighted]);

  function moveHighlight(offset: number) {
    if (selectableIndexes.length === 0) return;
    const currentPos = selectableIndexes.indexOf(highlighted);
    const start = currentPos === -1 ? (offset > 0 ? -1 : 0) : currentPos;
    const nextPos = (start + offset + selectableIndexes.length) % selectableIndexes.length;
    setHighlighted(selectableIndexes[nextPos] ?? -1);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      if (event.key === 'ArrowDown') moveHighlight(1);
      if (event.key === 'ArrowUp') moveHighlight(-1);
      if (event.key === 'Enter' || event.key === ' ') {
        const option = options[highlighted];
        if (option && !option.disabled) choose(option.value);
      }
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const query = event.key.toLowerCase();
      const match = options.findIndex(
        (option) => !option.disabled && optionText(option).toLowerCase().startsWith(query),
      );
      if (match >= 0) {
        if (!open) openMenu();
        setHighlighted(match);
      }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', containerClassName)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface text-left text-text',
          'transition-[border-color,box-shadow,color] duration-150',
          'hover:border-accent/50',
          'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-subtle',
          open && 'border-accent ring-2 ring-accent-ring',
          size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', !selected && 'text-text-tertiary')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-150',
            open && 'rotate-180 text-accent',
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={id}
            style={menuStyle}
            className={cn(
              'z-[60] overflow-y-auto overscroll-contain rounded-lg border border-border-strong bg-surface p-1',
              'animate-menu-in shadow-lg shadow-black/10',
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlighted;
              return (
                <button
                  key={option.value === '' ? `__empty-${optionText(option)}` : option.value}
                  type="button"
                  role="option"
                  data-index={index}
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlighted(index);
                  }}
                  onClick={() => {
                    if (!option.disabled) choose(option.value);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    isHighlighted && !option.disabled && 'bg-accent-soft text-accent',
                    !isHighlighted && !isSelected && 'text-text hover:bg-bg-subtle',
                    isSelected && !isHighlighted && 'bg-bg-subtle text-text',
                    size === 'sm' && 'py-1.5 text-xs',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
