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

const FLOW_ORDER: ProjectStatus[] = [
  'DRAFT',
  'PENDING_SIGNATURES',
  'SIGNED',
  'UNDER_BANK_REVIEW',
  'APPROVED',
];

/** Visualiza o fluxo Agrônomo → Banco → Produtor. */
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
  const currentIndex = rejected
    ? FLOW_ORDER.indexOf('UNDER_BANK_REVIEW')
    : FLOW_ORDER.indexOf(status);

  return (
    <ol className="flex w-full items-start">
      {FLOW.map((step, index) => {
        const done = index < currentIndex || (index === currentIndex && !rejected);
        const isLast = index === FLOW.length - 1;
        const isDecisionStep = step.status === 'APPROVED';
        const Icon = isDecisionStep && rejected ? ThumbsDown : step.icon;
        const label = isDecisionStep
          ? rejected
            ? 'Reprovado pelo banco'
            : done
              ? 'Aprovado pelo banco'
              : step.label
          : step.label;
        const connectorDone = index < currentIndex;

        return (
          <li key={step.status} className="relative flex min-w-0 flex-1 flex-col items-center px-1">
            {!isLast && (
              <div
                aria-hidden
                className={cn(
                  'absolute top-3.5 left-[calc(50%+1rem)] right-[calc(-50%+1rem)] h-px',
                  connectorDone ? 'bg-accent' : 'bg-border',
                )}
              />
            )}
            <div
              className={cn(
                'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
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
                'mt-1.5 w-full text-center text-[10px] font-medium leading-tight sm:text-[11px]',
                done || (isDecisionStep && rejected) ? 'text-text' : 'text-text-tertiary',
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
