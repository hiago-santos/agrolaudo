import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: 'accent' | 'gold' | 'warning' | 'danger' | 'success' | 'neutral';
}

const ACCENT_BAR: Record<NonNullable<CardProps['accent']>, string> = {
  accent: 'before:bg-accent',
  gold: 'before:bg-gold',
  warning: 'before:bg-warning',
  danger: 'before:bg-danger',
  success: 'before:bg-success',
  neutral: 'before:bg-border-strong',
};

export function Card({ className, accent, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-[0_1px_3px_rgba(34,31,23,0.05)]',
        accent &&
          cn(
            'relative overflow-hidden pl-4 before:absolute before:inset-y-0 before:left-0 before:w-[3px]',
            ACCENT_BAR[accent],
          ),
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-display text-base font-semibold tracking-tight text-text', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-secondary', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 p-5 pt-0', className)} {...props} />;
}
