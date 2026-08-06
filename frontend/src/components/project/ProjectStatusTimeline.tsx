import { Ban, Check, Clock, Landmark, PenLine, Sprout, ThumbsDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { ProjectStatus } from '@/types/domain';

interface TimelineStep {
  status: ProjectStatus;
  label: string;
  icon: typeof Sprout;
}

/**
 * BANK_INITIATED só aparece de fato quando o projeto nasceu como "casca" aberta pelo
 * banco — nesse caso o passo aparece antes de DRAFT. Projetos emitidos direto pelo
 * agrônomo pulam esse passo (ver `visibleFlow` abaixo).
 */
const FLOW: TimelineStep[] = [
  { status: 'BANK_INITIATED', label: 'Aberto pelo banco', icon: Landmark },
  { status: 'DRAFT', label: 'Emitido pelo agrônomo', icon: Sprout },
  { status: 'PENDING_SIGNATURES', label: 'Aguardando assinaturas', icon: PenLine },
  { status: 'SIGNED', label: 'Assinado', icon: Check },
  { status: 'UNDER_BANK_REVIEW', label: 'Em análise no banco', icon: Landmark },
  { status: 'AWAITING_PRODUCER_INFO', label: 'Em ajuste', icon: Clock },
  { status: 'APPROVED', label: 'Decisão do banco', icon: Check },
];

const FLOW_ORDER: ProjectStatus[] = [
  'BANK_INITIATED',
  'DRAFT',
  'PENDING_SIGNATURES',
  'SIGNED',
  'UNDER_BANK_REVIEW',
  'AWAITING_PRODUCER_INFO',
  'APPROVED',
];

interface ProjectStatusTimelineProps {
  status: ProjectStatus;
  /** Projetos emitidos direto pelo agrônomo nunca passam por BANK_INITIATED — esconde o passo. */
  wasBankInitiated?: boolean;
}

/** Visualiza o fluxo Banco (opcional) → Agrônomo → Assinaturas → Banco → Produtor. */
export function ProjectStatusTimeline({ status, wasBankInitiated }: ProjectStatusTimelineProps) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        <Ban className="h-4 w-4 shrink-0" />
        Projeto cancelado
      </div>
    );
  }

  const visibleFlow = wasBankInitiated
    ? FLOW
    : FLOW.filter((step) => step.status !== 'BANK_INITIATED');
  const rejected = status === 'REJECTED';
  const timelineStatus =
    status === 'AWAITING_PRODUCER_INFO' ? 'AWAITING_PRODUCER_INFO' : status;
  const currentIndex = rejected
    ? FLOW_ORDER.indexOf('UNDER_BANK_REVIEW')
    : FLOW_ORDER.indexOf(timelineStatus);

  return (
    <ol className="flex w-full items-start">
      {visibleFlow.map((step, index) => {
        const stepIndex = FLOW_ORDER.indexOf(step.status);
        const done = stepIndex < currentIndex || (stepIndex === currentIndex && !rejected);
        const isLast = index === visibleFlow.length - 1;
        const isDecisionStep = step.status === 'APPROVED';
        const Icon = isDecisionStep && rejected ? ThumbsDown : step.icon;
        const label = isDecisionStep
          ? rejected
            ? 'Reprovado pelo banco'
            : done
              ? 'Aprovado pelo banco'
              : step.label
          : step.label;
        const connectorDone = stepIndex < currentIndex;

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
                  ? 'bg-danger text-danger-contrast'
                  : done
                    ? 'bg-accent text-accent-contrast'
                    : 'bg-bg-subtle text-text-tertiary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span
              className={cn(
                'mt-1.5 w-full text-center text-[11px] font-medium leading-tight',
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
