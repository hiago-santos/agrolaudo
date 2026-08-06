import { Check } from '@phosphor-icons/react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Step1ProducerSelection } from '@/components/project/Step1ProducerSelection';
import { StepFinancedArea } from '@/components/project/StepFinancedArea';
import { cn } from '@/lib/cn';
import { emptyDraft, type ProjectDraft } from '@/types/projectDraft';

const STEPS = ['Produtor & Safra', 'Área financiada'];

function BankStepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex w-full items-center">
      {STEPS.map((title, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        const isLast = index === STEPS.length - 1;
        return (
          <li
            key={title}
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
                {done ? <Check className="h-3.5 w-3.5" /> : number}
              </div>
              <span
                className={cn(
                  'truncate text-xs font-medium',
                  active ? 'block' : 'hidden sm:block',
                  active || done ? 'text-text' : 'text-text-tertiary',
                )}
              >
                {title}
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

/**
 * Fluxo restrito de abertura do banco: produtor/propriedade/safra/agrônomo + área
 * financiada desenhada no mapa. Sem atividades — o agrônomo completa depois
 * (ver CompleteProject.tsx).
 */
export function NewBankProject() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft());

  function onChange(patch: Partial<ProjectDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Abrir Projeto"
        description="Delimite a área da propriedade pleiteada pro financiamento — o agrônomo completa o restante."
      />

      <BankStepIndicator current={step} />

      <div key={step} className="animate-page-enter">
        {step === 1 && (
          <Step1ProducerSelection
            draft={draft}
            onChange={onChange}
            onNext={() => setStep(2)}
            nextLabel="Próximo: Área financiada"
          />
        )}
        {step === 2 && (
          <StepFinancedArea draft={draft} onChange={onChange} onBack={() => setStep(1)} />
        )}
      </div>
    </div>
  );
}
