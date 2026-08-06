import { FilePlus, Files } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CompactCurrency, CompactName, CompactStatus } from '@/components/ui/Compact';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCards, SkeletonList, SkeletonPageHeader } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { dashboardService } from '@/services/dashboard';
import { toast } from '@/stores/toast';
import type { DashboardSummary } from '@/types/domain';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    dashboardService
      .summary()
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => toast.error('Não foi possível carregar o resumo do dashboard.'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonPageHeader />
        <div className="space-y-3">
          <SkeletonCards count={1} />
          <SkeletonCards count={4} className="grid-cols-2 lg:grid-cols-4" />
        </div>
        <Card>
          <SkeletonList rows={5} />
        </Card>
      </div>
    );
  }
  if (!summary) return null;

  const secondaryKpis = [
    {
      label: 'Projetos no mês',
      value: String(summary.projectsThisMonth),
      accent: 'neutral' as const,
    },
    {
      label: 'Aguardando assinatura',
      value: String(summary.pendingSignaturesCount),
      accent: 'warning' as const,
    },
    {
      label: 'Em análise no banco',
      value: String(summary.underBankReviewCount),
      accent: 'gold' as const,
    },
    {
      label: 'Produtores cadastrados',
      value: String(summary.activeProducersCount),
      accent: 'neutral' as const,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral da emissão de projetos"
        actions={
          <Link to="/projects/new" className={buttonVariants('primary', 'md')}>
            <FilePlus className="h-4 w-4" />
            Novo Projeto
          </Link>
        }
      />

      <div className="space-y-3">
        <Card accent="accent">
          <CardContent className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              Faturamento no mês
            </p>
            <p
              data-compact-host
              className="min-w-0 font-mono text-2xl font-medium tabular-nums tracking-tight text-text sm:text-3xl"
            >
              <CompactCurrency value={summary.revenueThisMonth} />
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {secondaryKpis.map((kpi) => (
            <Card key={kpi.label} accent={kpi.accent}>
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                  {kpi.label}
                </p>
                <p className="mt-2 font-mono text-2xl font-medium tabular-nums tracking-tight text-text">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-text">Últimos projetos</h2>
          <Link
            to="/projects"
            className="text-xs font-medium uppercase tracking-wide text-accent hover:underline"
          >
            Ver todos os projetos
          </Link>
        </div>

        {summary.recentProjects.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Files}
              title="Nenhum projeto emitido ainda"
              description="Quando você emitir o primeiro projeto, ele aparece aqui."
              action={
                <Link to="/projects/new" className={buttonVariants('primary', 'sm')}>
                  Criar primeiro projeto
                </Link>
              }
            />
          </div>
        ) : (
          <ul>
            {summary.recentProjects.map((project) => (
              <li key={project.id} className="border-b border-border last:border-0">
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-inset"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">
                      <CompactName name={project.producer.name} />
                    </p>
                    <p className="truncate font-mono text-xs tabular-nums text-text-secondary">
                      {project.number}
                      <span className="hidden sm:inline"> · {project.property.name}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <span className="font-mono text-sm font-medium tabular-nums text-text">
                      <CompactCurrency value={project.totalRevenue} />
                    </span>
                    <CompactStatus status={project.status} className="max-sm:hidden" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
