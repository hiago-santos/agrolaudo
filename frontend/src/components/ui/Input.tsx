import { forwardRef } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export { Select, type SelectOption } from '@/components/ui/Select';

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

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(FIELD_BASE, 'min-h-20 py-2', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary',
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
