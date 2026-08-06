import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Step1ProducerSelection } from '@/components/project/Step1ProducerSelection';
import { Step2Activities } from '@/components/project/Step2Activities';
import { Step3Review } from '@/components/project/Step3Review';
import { StepIndicator } from '@/components/project/StepIndicator';
import { PageHeader } from '@/components/layout/PageHeader';
import { producersService } from '@/services/producers';
import { emptyDraft, type ProjectDraft } from '@/types/projectDraft';

export function NewProject() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft());

  function onChange(patch: Partial<ProjectDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    const producerId = searchParams.get('producerId');
    const propertyId = searchParams.get('propertyId');
    if (!producerId) return;
    void producersService.get(producerId).then((producer) => {
      const property = propertyId
        ? (producer.properties.find((p) => p.id === propertyId) ?? null)
        : producer.properties.length === 1
          ? producer.properties[0]
          : null;
      onChange({ producer, property: property ?? null });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Projeto"
        description="Laudo de Capacidade Pagadora — 3 passos rápidos"
      />

      <StepIndicator current={step} />

      <div key={step} className="animate-page-enter">
        {step === 1 && (
          <Step1ProducerSelection draft={draft} onChange={onChange} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2Activities
            draft={draft}
            onChange={onChange}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && <Step3Review draft={draft} onChange={onChange} onBack={() => setStep(2)} />}
      </div>
    </div>
  );
}
