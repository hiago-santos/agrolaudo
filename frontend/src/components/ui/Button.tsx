import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow disabled:hover:bg-accent',
  secondary: 'bg-bg-subtle text-text hover:bg-border/60 border border-border',
  outline: 'border border-border-strong bg-transparent text-text hover:bg-bg-subtle',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-subtle hover:text-text',
  danger: 'bg-danger text-white hover:brightness-95 shadow-sm',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
};

/**
 * Classes do botão sem o elemento — usado para estilizar um `<Link>` do
 * react-router como botão (navegação não pode ser um `<button onClick>`,
 * precisa continuar sendo um link de verdade para o browser/acessibilidade).
 */
export function buttonVariants(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium',
    'transition-all duration-[0.18s] ease-[cubic-bezier(0.22,1,0.36,1)]',
    'hover:-translate-y-px active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        className={cn(
          buttonVariants(variant, size),
          'disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
