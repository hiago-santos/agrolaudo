import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-border-strong text-text-secondary bg-transparent',
  accent: 'border-accent text-accent bg-accent-soft',
  success: 'border-success text-success bg-success-soft',
  warning: 'border-warning text-warning bg-warning-soft',
  danger: 'border-danger text-danger bg-danger-soft',
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 sm:px-2',
        'text-[10px] font-semibold uppercase tracking-wide sm:text-[11px] sm:tracking-wider',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
