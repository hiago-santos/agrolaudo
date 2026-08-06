import { ArrowLeft, Landmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { LocationMapField } from '@/components/map/LocationMapField';
import { Step2Activities } from '@/components/project/Step2Activities';
import { Step3Review } from '@/components/project/Step3Review';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCards, SkeletonPageHeader } from '@/components/ui/Skeleton';
import { formatNumber } from '@/lib/format';
import { projectsService } from '@/services/projects';
import { toast } from '@/stores/toast';
import { emptyDraft, type ProjectDraft } from '@/types/projectDraft';
import type { Project } from '@/types/domain';

/**
 * Agrônomo completando um projeto que o banco abriu (status BANK_INITIATED): só
 * atividades + revisão, já que produtor/propriedade/área financeira já vieram
 * definidos na abertura. Ver StepFinancedArea.tsx pro outro lado desse fluxo.
 */
export function CompleteProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    projectsService
      .get(id)
      .then((loaded) => {
        setProject(loaded);
        setDraft((current) => ({ ...current, agronomistId: loaded.agronomist.id }));
      })
      .catch(() => toast.error('Não foi possível carregar o projeto.'))
      .finally(() => setLoading(false));
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

  if (project.status !== 'BANK_INITIATED') {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Landmark}
          title="Este projeto já foi completado"
          description="Só é possível completar atividades em projetos abertos pelo banco e ainda pendentes."
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
        title={`Completar ${project.number}`}
        description="Aberto pelo banco — escolha as atividades e emita o projeto."
      />

      <Card className="space-y-3 p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <SummaryLine label="Produtor" value={project.producer.name} />
          <SummaryLine label="Propriedade" value={project.property.name} />
          <SummaryLine label="Safra" value={project.season.label} />
        </div>
        {project.financedAreaBoundary && (
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-text-tertiary">
              Área financiada delimitada pelo banco
              {project.financedAreaHectares
                ? ` · ${formatNumber(project.financedAreaHectares)} ha`
                : ''}
            </p>
            <LocationMapField
              boundary={project.financedAreaBoundary}
              height="clamp(240px, 34vh, 380px)"
            />
          </div>
        )}
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
