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
        'inline-flex items-center gap-1 rounded border px-2 py-0.5',
        'text-[11px] font-semibold uppercase tracking-wider',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
