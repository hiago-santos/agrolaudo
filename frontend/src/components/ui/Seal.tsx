import { Sprout } from 'lucide-react';

import { cn } from '@/lib/cn';

interface SealProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SealProps['size']>, { outer: string; icon: string }> = {
  sm: { outer: 'h-8 w-8', icon: 'h-3.5 w-3.5' },
  md: { outer: 'h-10 w-10', icon: 'h-4 w-4' },
  lg: { outer: 'h-14 w-14', icon: 'h-6 w-6' },
};

export function Seal({ size = 'md', className }: SealProps) {
  const sizes = SIZE_CLASSES[size];

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full',
        'border-2 border-accent bg-accent-soft text-accent',
        sizes.outer,
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-[3px] rounded-full border border-accent/40" />
      <Sprout className={sizes.icon} />
    </div>
  );
}
