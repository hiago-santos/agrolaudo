import { ArrowLeft, PencilSimple } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Step2Activities } from '@/components/project/Step2Activities';
import { Step3Review } from '@/components/project/Step3Review';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCards, SkeletonPageHeader } from '@/components/ui/Skeleton';
import { activitiesService } from '@/services/activities';
import { priceQuotesService } from '@/services/price-quotes';
import { projectsService } from '@/services/projects';
import { toast } from '@/stores/toast';
import { emptyDraft, type ItemDraft, type ProjectDraft } from '@/types/projectDraft';
import type { Project } from '@/types/domain';

/** Agrônomo/banco ajustando um projeto devolvido pelo banco (AWAITING_PRODUCER_INFO). */
export function AdjustProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void (async () => {
      try {
        const loaded = await projectsService.get(id);
        setProject(loaded);
        const [activities, matrix] = await Promise.all([
          activitiesService.list({ active: true }),
          priceQuotesService.currentMatrix(),
        ]);
        const quoteByActivity = new Map(matrix.map((m) => [m.activity.id, m.currentQuote]));
        const items: Record<string, ItemDraft> = {};
        for (const activity of activities) {
          const existing = loaded.items.find((item) => item.activityId === activity.id);
          const quote = quoteByActivity.get(activity.id);
          items[activity.id] = {
            selected: !!existing,
            activity,
            unit: existing?.unit ?? quote?.unit ?? activity.defaultUnit,
            areaHectares: existing?.areaHectares ?? '',
            productivity: existing?.productivity ?? '',
            unitPrice: existing?.unitPrice ?? quote?.unitPrice ?? '0',
            costPerHectare: existing?.costPerHectare ?? quote?.costPerHectare ?? '0',
            herdHeadCount: existing?.herdHeadCount ?? '',
          };
        }
        setDraft({
          ...emptyDraft(),
          agronomistId: loaded.agronomist.id,
          notes: loaded.notes ?? '',
          items,
        });
      } catch {
        toast.error('Não foi possível carregar o projeto.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function onChange(patch: Partial<ProjectDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonCards count={2} />
      </div>
    );
  }

  if (!project) return null;

  if (project.status !== 'AWAITING_PRODUCER_INFO') {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={PencilSimple}
          title="Este projeto não está em ajuste"
          description="Só é possível editar projetos devolvidos pelo banco para correção."
        />
        <Link
          to={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ver projeto {project.number}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to={`/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o projeto
      </Link>

      <PageHeader
        title={`Ajustar ${project.number}`}
        description="Corrija as atividades conforme solicitado pelo banco e reenvie para análise."
      />

      <Card className="grid gap-3 p-5 text-sm sm:grid-cols-3">
        <SummaryLine label="Produtor" value={project.producer.name} />
        <SummaryLine label="Propriedade" value={project.property.name} />
        <SummaryLine label="Safra" value={project.season.label} />
      </Card>

      <div key={step} className="animate-page-enter">
        {step === 1 && (
          <Step2Activities
            draft={draft}
            onChange={onChange}
            onNext={() => setStep(2)}
            onBack={() => navigate(`/projects/${project.id}`)}
          />
        )}
        {step === 2 && (
          <Step3Review
            draft={draft}
            onChange={onChange}
            onBack={() => setStep(1)}
            projectId={project.id}
            mode="adjust"
          />
        )}
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="text-sm font-medium text-text">{value}</p>
    </div>
  );
}
