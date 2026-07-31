import { Check } from 'lucide-react';

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
    <ol className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((step, index) => {
        const done = step.number < current;
        const active = step.number === current;
        return (
          <li key={step.number} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done && 'bg-accent text-white',
                  active && 'bg-accent-soft text-accent ring-2 ring-accent-ring',
                  !done && !active && 'bg-bg-subtle text-text-tertiary',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step.number}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:block',
                  active || done ? 'text-text' : 'text-text-tertiary',
                )}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn('h-px flex-1', done ? 'bg-accent' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
