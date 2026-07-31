import { ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

const FIELD_BASE = cn(
  'w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text placeholder:text-text-tertiary',
  'transition-[border-color,box-shadow] duration-150',
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-subtle',
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(FIELD_BASE, 'h-9', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(FIELD_BASE, 'min-h-20 py-2', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Classes de layout (largura) — o chevron acompanha a borda do campo. */
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => (
    <div className={cn('relative inline-flex w-full items-center', containerClassName)}>
      <select
        ref={ref}
        className={cn(
          FIELD_BASE,
          'h-9 cursor-pointer appearance-none pr-9',
          'hover:border-accent/50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 h-4 w-4 text-text-tertiary"
      />
    </div>
  ),
);
Select.displayName = 'Select';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary', className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
