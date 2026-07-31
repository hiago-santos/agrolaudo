import { Ban, Check, Landmark, PenLine, Sprout, ThumbsDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { ProjectStatus } from '@/types/domain';

interface TimelineStep {
  status: ProjectStatus;
  label: string;
  icon: typeof Sprout;
}

const FLOW: TimelineStep[] = [
  { status: 'DRAFT', label: 'Emitido pelo agrônomo', icon: Sprout },
  { status: 'PENDING_SIGNATURES', label: 'Aguardando assinaturas', icon: PenLine },
  { status: 'SIGNED', label: 'Assinado', icon: Check },
  { status: 'UNDER_BANK_REVIEW', label: 'Em análise no banco', icon: Landmark },
  { status: 'APPROVED', label: 'Decisão do banco', icon: Check },
];

const FLOW_ORDER: ProjectStatus[] = ['DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'UNDER_BANK_REVIEW', 'APPROVED'];

/** Visualiza o fluxo Agrônomo → Banco → Produtor (ver plano, ponto 3). */
export function ProjectStatusTimeline({ status }: { status: ProjectStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        <Ban className="h-4 w-4 shrink-0" />
        Projeto cancelado
      </div>
    );
  }

  const rejected = status === 'REJECTED';
  const currentIndex = rejected ? FLOW_ORDER.indexOf('UNDER_BANK_REVIEW') : FLOW_ORDER.indexOf(status);

  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1 sm:gap-2">
      {FLOW.map((step, index) => {
        const done = index < currentIndex || (index === currentIndex && !rejected);
        const isLast = index === FLOW.length - 1;
        const isDecisionStep = step.status === 'APPROVED';
        const Icon = isDecisionStep && rejected ? ThumbsDown : step.icon;
        const label = isDecisionStep ? (rejected ? 'Reprovado pelo banco' : done ? 'Aprovado pelo banco' : step.label) : step.label;

        return (
          <li key={step.status} className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
                  isDecisionStep && rejected
                    ? 'bg-danger text-white'
                    : done
                      ? 'bg-accent text-white'
                      : 'bg-bg-subtle text-text-tertiary',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={cn(
                  'max-w-[92px] text-center text-[10px] font-medium leading-tight',
                  done || (isDecisionStep && rejected) ? 'text-text' : 'text-text-tertiary',
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn('h-px w-6 shrink-0 sm:w-10', index < currentIndex ? 'bg-accent' : 'bg-border')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
