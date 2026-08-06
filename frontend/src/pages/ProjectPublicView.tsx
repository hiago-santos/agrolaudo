import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { Seal } from '@/components/ui/Seal';
import { SkeletonTable, SkeletonText } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { ApiError } from '@/lib/api';
import { CompactCurrency, CompactName } from '@/components/ui/Compact';
import { formatCurrency, formatDate, formatDateTime, formatPercentage } from '@/lib/format';
import { PROJECT_STATUS_LABEL } from '@/lib/projectStatus';
import { unitLabel } from '@/lib/units';
import { publicService, type PublicProjectView } from '@/services/public';

/** Link público para o produtor consultar o laudo e o resultado da análise. */
export function ProjectPublicView() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<PublicProjectView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !token) {
      setError('Link inválido — verifique se copiou o endereço completo.');
      setLoading(false);
      return;
    }
    publicService
      .getProjectView(projectId, token)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'Não foi possível abrir este projeto.'),
      )
      .finally(() => setLoading(false));
  }, [projectId, token]);

  const approved = data?.project.status === 'APPROVED';
  const rejected = data?.project.status === 'REJECTED';

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-1 pb-8 text-center">
        <Seal size="md" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-text">
          AgroLaudo
        </h1>
        <p className="text-sm text-text-secondary">Laudo de Capacidade Pagadora</p>
      </div>

      <div className="mx-auto max-w-2xl">
        {loading && (
          <Card className="overflow-hidden">
            <div className="space-y-4 p-5">
              <SkeletonText lines={3} />
            </div>
            <SkeletonTable rows={3} columns={3} />
          </Card>
        )}

        {!loading && error && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <XCircle className="h-8 w-8 text-danger" />
            <p className="text-sm font-medium text-text">{error}</p>
          </Card>
        )}

        {!loading && data && !error && (
          <div className="space-y-5">
            {(approved || rejected) && (
              <Card
                className={
                  approved
                    ? 'flex items-start gap-3 border-success/30 bg-success-soft/40 p-5'
                    : 'flex items-start gap-3 border-danger/30 bg-danger-soft/40 p-5'
                }
              >
                {approved ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                )}
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-text">
                    {approved ? 'Crédito aprovado' : 'Crédito reprovado'}
                  </p>
                  {approved && data.project.approvedCreditLimit && (
                    <p className="text-text-secondary">
                      Limite aprovado:{' '}
                      <span className="font-medium text-text">
                        {formatCurrency(data.project.approvedCreditLimit)}
                      </span>
                    </p>
                  )}
                  {data.project.bankNotes && (
                    <p className="text-text-secondary">{data.project.bankNotes}</p>
                  )}
                  {data.project.bankReviewedAt && (
                    <p className="text-xs text-text-tertiary">
                      Decisão em {formatDateTime(data.project.bankReviewedAt)}
                    </p>
                  )}
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Dados do projeto
                </h2>
              </div>
              <div className="space-y-2 p-5 text-sm">
                <p className="font-mono font-medium text-text">{data.project.number}</p>
                <p className="text-text-secondary">
                  <CompactName name={data.project.producer.name} /> · {data.project.property.name} ·
                  Safra {data.project.season.label}
                </p>
                <p className="text-xs text-text-tertiary">
                  Agrônomo: {data.project.agronomist.name} · {data.project.agronomist.licenseNumber}
                </p>
                <p className="text-xs text-text-tertiary">
                  Emitido em {formatDate(data.project.issueDate)} ·{' '}
                  {PROJECT_STATUS_LABEL[data.project.status]}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead className="hidden sm:table-cell">Unidade</TableHead>
                    <TableHead className="text-right">Receita Líquida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.project.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.activityName}</TableCell>
                      <TableCell className="hidden text-text-secondary sm:table-cell">
                        {unitLabel(item.unit)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        <CompactCurrency value={item.netProfit} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="grid gap-2 border-t border-border px-5 py-4 sm:grid-cols-3">
                <Summary label="Receita bruta" value={data.project.totalRevenue} />
                <Summary label="Custo total" value={data.project.totalCost} />
                <Summary label="Receita líquida" value={data.project.totalProfit} highlight />
              </div>
              <p className="border-t border-border px-5 py-3 text-xs text-text-tertiary">
                Margem operacional: {formatPercentage(data.project.profitMarginPercentage)}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <p
        className={
          highlight
            ? 'font-mono text-sm font-semibold tabular-nums text-accent'
            : 'font-mono text-sm tabular-nums text-text'
        }
      >
        <CompactCurrency value={value} />
      </p>
    </div>
  );
}
