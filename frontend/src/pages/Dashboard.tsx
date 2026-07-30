import { FileStack, FilePlus2, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatarMoeda } from '@/lib/format';
import { dashboardService } from '@/services/dashboard';
import { toast } from '@/stores/toast';
import type { DashboardResumo, StatusLaudo } from '@/types/domain';

const STATUS_TONE: Record<StatusLaudo, 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  RASCUNHO: 'neutral',
  AGUARDANDO_ASSINATURA: 'warning',
  ASSINADO: 'success',
  CANCELADO: 'danger',
};

const STATUS_LABEL: Record<StatusLaudo, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura',
  ASSINADO: 'Assinado',
  CANCELADO: 'Cancelado',
};

export function Dashboard() {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    dashboardService
      .resumo()
      .then((data) => {
        if (ativo) setResumo(data);
      })
      .catch(() => toast.error('Não foi possível carregar o resumo do dashboard.'))
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (loading) return <PageSpinner />;
  if (!resumo) return null;

  const kpis = [
    { label: 'Laudos no mês', value: String(resumo.laudosNoMes), icon: FileStack },
    { label: 'Aguardando assinatura', value: String(resumo.aguardandoAssinatura), icon: FilePlus2 },
    { label: 'Produtores cadastrados', value: String(resumo.produtoresAtivos), icon: Users },
    { label: 'Faturamento no mês', value: formatarMoeda(resumo.faturamentoNoMes), icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral da emissão de laudos"
        actions={
          <Link to="/laudos/novo" className={buttonVariants('primary', 'md')}>
            <FilePlus2 className="h-4 w-4" />
            Novo Laudo
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-text-secondary">{kpi.label}</p>
                <p className="text-2xl font-semibold tracking-tight text-text">{kpi.value}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
                <kpi.icon className="h-4 w-4 text-accent" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold text-text">Últimos laudos</h2>
          <Link to="/historico" className="text-xs font-medium text-accent hover:underline">
            Ver histórico completo
          </Link>
        </div>

        {resumo.ultimosLaudos.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FileStack}
              title="Nenhum laudo emitido ainda"
              description="Quando você emitir o primeiro laudo, ele aparece aqui."
              action={
                <Link to="/laudos/novo" className={buttonVariants('primary', 'sm')}>
                  Criar primeiro laudo
                </Link>
              }
            />
          </div>
        ) : (
          <ul>
            {resumo.ultimosLaudos.map((laudo) => (
              <li key={laudo.id} className="border-b border-border last:border-0">
                <Link
                  to={`/laudos/${laudo.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm transition-colors hover:bg-bg-subtle"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{laudo.produtor.nome}</p>
                    <p className="truncate text-xs text-text-secondary">
                      {laudo.numero} · {laudo.propriedade.nome}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium text-text">{formatarMoeda(laudo.totalFaturamento)}</span>
                    <Badge tone={STATUS_TONE[laudo.status]}>{STATUS_LABEL[laudo.status]}</Badge>
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
