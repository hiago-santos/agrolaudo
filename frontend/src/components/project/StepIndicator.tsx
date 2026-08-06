import { Check } from '@phosphor-icons/react';

import { cn } from '@/lib/cn';

interface Step {
  number: number;
  title: string;
}

const STEPS: Step[] = [
  { number: 1, title: 'Produtor & Safra' },
  { number: 2, title: 'Atividades' },
  { number: 3, title: 'Revisão & Emissão' },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex w-full items-center">
      {STEPS.map((step, index) => {
        const done = step.number < current;
        const active = step.number === current;
        const isLast = index === STEPS.length - 1;

        return (
          <li
            key={step.number}
            className={cn('flex min-w-0 items-center', isLast ? 'shrink-0' : 'flex-1')}
          >
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done && 'bg-accent text-accent-contrast',
                  active && 'bg-accent-soft text-accent ring-2 ring-accent-ring',
                  !done && !active && 'bg-bg-subtle text-text-tertiary',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step.number}
              </div>
              <span
                className={cn(
                  'truncate text-xs font-medium',
                  active ? 'block' : 'hidden sm:block',
                  active || done ? 'text-text' : 'text-text-tertiary',
                )}
              >
                {step.title}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn('mx-3 h-px min-w-4 flex-1 sm:mx-4', done ? 'bg-accent' : 'bg-border')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
