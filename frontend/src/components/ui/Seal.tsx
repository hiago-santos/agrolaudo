import { GrowthMark } from '@/components/ui/GrowthMark';
import { cn } from '@/lib/cn';

interface SealProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SealProps['size']>, { outer: string; icon: string }> = {
  sm: { outer: 'h-10 w-10', icon: 'h-5 w-5' },
  md: { outer: 'h-12 w-12', icon: 'h-6 w-6' },
  lg: { outer: 'h-16 w-16', icon: 'h-8 w-8' },
};

export function Seal({ size = 'md', className }: SealProps) {
  const sizes = SIZE_CLASSES[size];

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full',
        'bg-accent text-accent-contrast',
        'shadow-[0_2px_8px_rgba(30,77,43,0.28)]',
        sizes.outer,
        className,
      )}
      aria-hidden
    >
      <GrowthMark className={sizes.icon} />
    </div>
  );
}
