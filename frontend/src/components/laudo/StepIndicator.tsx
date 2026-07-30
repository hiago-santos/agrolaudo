import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

interface Step {
  numero: number;
  titulo: string;
}

const STEPS: Step[] = [
  { numero: 1, titulo: 'Produtor & Safra' },
  { numero: 2, titulo: 'Atividades' },
  { numero: 3, titulo: 'Revisão & Emissão' },
];

export function StepIndicator({ atual }: { atual: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((step, index) => {
        const concluido = step.numero < atual;
        const ativo = step.numero === atual;
        return (
          <li key={step.numero} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  concluido && 'bg-accent text-white',
                  ativo && 'bg-accent-soft text-accent ring-2 ring-accent-ring',
                  !concluido && !ativo && 'bg-bg-subtle text-text-tertiary',
                )}
              >
                {concluido ? <Check className="h-3.5 w-3.5" /> : step.numero}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:block',
                  ativo || concluido ? 'text-text' : 'text-text-tertiary',
                )}
              >
                {step.titulo}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn('h-px flex-1', concluido ? 'bg-accent' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
