import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Step1SelecaoProdutor } from '@/components/laudo/Step1SelecaoProdutor';
import { Step2Atividades } from '@/components/laudo/Step2Atividades';
import { Step3Revisao } from '@/components/laudo/Step3Revisao';
import { StepIndicator } from '@/components/laudo/StepIndicator';
import { PageHeader } from '@/components/layout/PageHeader';
import { produtoresService } from '@/services/produtores';
import { draftVazio, type LaudoDraft } from '@/types/laudoDraft';

export function NovoLaudo() {
  const [searchParams] = useSearchParams();
  const [passo, setPasso] = useState(1);
  const [draft, setDraft] = useState<LaudoDraft>(draftVazio());

  function onChange(patch: Partial<LaudoDraft>) {
    setDraft((atual) => ({ ...atual, ...patch }));
  }

  useEffect(() => {
    const produtorId = searchParams.get('produtorId');
    const propriedadeId = searchParams.get('propriedadeId');
    if (!produtorId) return;
    void produtoresService.obter(produtorId).then((produtor) => {
      const propriedade = propriedadeId
        ? (produtor.propriedades.find((p) => p.id === propriedadeId) ?? null)
        : produtor.propriedades.length === 1
          ? produtor.propriedades[0]
          : null;
      onChange({ produtor, propriedade: propriedade ?? null });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Laudo"
        description="Laudo de Capacidade Pagadora — 3 passos rápidos"
      />

      <StepIndicator atual={passo} />

      {passo === 1 && (
        <Step1SelecaoProdutor draft={draft} onChange={onChange} onNext={() => setPasso(2)} />
      )}
      {passo === 2 && (
        <Step2Atividades
          draft={draft}
          onChange={onChange}
          onNext={() => setPasso(3)}
          onBack={() => setPasso(1)}
        />
      )}
      {passo === 3 && <Step3Revisao draft={draft} onChange={onChange} onBack={() => setPasso(2)} />}
    </div>
  );
}
