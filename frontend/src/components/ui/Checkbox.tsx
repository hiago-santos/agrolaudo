import { Check } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Classes no indicador visual. */
  boxClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, boxClassName, disabled, ...props }, ref) => {
    return (
      <span
        className={cn(
          'relative inline-flex h-4 w-4 shrink-0 items-center justify-center',
          disabled && 'opacity-50',
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none flex h-4 w-4 items-center justify-center rounded-[4px] border border-border-strong bg-surface text-accent-contrast',
            'transition-[background-color,border-color,box-shadow] duration-150',
            'peer-hover:border-accent/60',
            'peer-focus-visible:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-ring',
            'peer-checked:border-accent peer-checked:bg-accent',
            boxClassName,
          )}
        />
        <Check
          aria-hidden
          strokeWidth={2.5}
          className="pointer-events-none absolute h-3 w-3 text-accent-contrast opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
        />
      </span>
    );
  },
);
Checkbox.displayName = 'Checkbox';
