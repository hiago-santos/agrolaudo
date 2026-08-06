import { CircleNotch } from '@phosphor-icons/react';

import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return <CircleNotch className={cn('h-4 w-4 animate-spin text-accent', className)} />;
}
