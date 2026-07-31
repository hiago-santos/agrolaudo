import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { unitLabel } from '@/lib/units';
import { draftToProjectInput } from '@/lib/projectDraft';
import { projectsService, type ProjectItemInput } from '@/services/projects';
import { toast } from '@/stores/toast';
import type { ProjectCalculationResult } from '@/types/domain';
import type { ProjectDraft } from '@/types/projectDraft';

interface Step3Props {
  draft: ProjectDraft;
  onChange: (patch: Partial<ProjectDraft>) => void;
  onBack: () => void;
}

export function Step3Review({ draft, onChange, onBack }: Step3Props) {
  const navigate = useNavigate();
  const [result, setResult] = useState<ProjectCalculationResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(true);
  const [issuing, setIssuing] = useState(false);

  const selectedItems = useMemo(() => Object.values(draft.items).filter((item) => item.selected), [draft.items]);

  useEffect(() => {
    const itemsInput: ProjectItemInput[] = selectedItems.map((item) => ({
      activityId: item.activity.id,
      unit: item.unit,
      areaHectares: Number(item.areaHectares || 0),
      productivity: Number(item.productivity || 0),
      unitPrice: Number(item.unitPrice || 0),
      costPerHectare: Number(item.costPerHectare || 0),
      herdHeadCount: item.activity.isLivestock ? Number(item.herdHeadCount || 0) : undefined,
    }));
    setLoadingResult(true);
    projectsService
      .calculate(itemsInput)
      .then(setResult)
      .catch(() => toast.error('Não foi possível calcular a revisão do projeto.'))
      .finally(() => setLoadingResult(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function issue() {
    setIssuing(true);
    try {
      const created = await projectsService.create(draftToProjectInput(draft));
      toast.success(`Projeto ${created.number} emitido.`, 'Colete as assinaturas na tela de detalhe.');
      navigate(`/projects/${created.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível emitir o projeto.');
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Informações adicionais para constar no projeto..."
        />
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Resumo</p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryLine label="Produtor" value={draft.producer?.name ?? '—'} />
          <SummaryLine label="Propriedade" value={draft.property?.name ?? '—'} />
          <SummaryLine label="Safra" value={draft.season?.label ?? '—'} />
          <SummaryLine label="Cidade de emissão" value={draft.issuingCity || '—'} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Quadro de Produção
          </h2>
        </div>
        {loadingResult ? (
          <SkeletonTable rows={4} columns={5} />
        ) : (
          <>
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Receita Líquida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result?.items.map((item) => (
                  <TableRow key={item.activityId}>
                    <TableCell className="font-medium">{item.activityName}</TableCell>
                    <TableCell className="text-text-secondary">{unitLabel(item.unit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.grossRevenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell className="text-right font-medium text-accent">
                      {formatCurrency(item.netProfit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {result && (
              <div className="grid grid-cols-2 gap-4 border-t border-border p-5 sm:grid-cols-4">
                <SummaryLine label="Faturamento total" value={formatCurrency(result.consolidated.totalRevenue)} />
                <SummaryLine label="Custo total" value={formatCurrency(result.consolidated.totalCost)} />
                <SummaryLine
                  label="Receita líquida"
                  value={formatCurrency(result.consolidated.totalProfit)}
                  highlight
                />
                <SummaryLine
                  label="Margem"
                  value={formatPercentage(result.consolidated.profitMarginPercentage)}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={issuing}>
          Voltar
        </Button>
        <Button onClick={() => void issue()} loading={issuing}>
          Concluir e Emitir Projeto
        </Button>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={highlight ? 'text-sm font-semibold text-accent' : 'text-sm font-medium text-text'}>{value}</p>
    </div>
  );
}
