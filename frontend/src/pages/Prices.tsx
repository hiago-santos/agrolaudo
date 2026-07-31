import { Download, History, Save, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select } from '@/components/ui/Input';
import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ApiError } from '@/lib/api';
import { ACTIVITY_CATEGORY_LABEL, ACTIVITY_CATEGORY_ORDER } from '@/lib/activity-categories';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { unitLabel } from '@/lib/units';
import { priceQuotesService, type PriceQuoteItemInput } from '@/services/price-quotes';
import { toast } from '@/stores/toast';
import type { PriceMatrixItem, PriceQuote } from '@/types/domain';

interface EditableRow {
  activityId: string;
  unit: string;
  unitPrice: string;
  costPerHectare: string;
}

function toRow(item: PriceMatrixItem): EditableRow {
  return {
    activityId: item.activity.id,
    unit: item.currentQuote?.unit ?? item.activity.defaultUnit,
    unitPrice: item.currentQuote?.unitPrice ?? '0',
    costPerHectare: item.currentQuote?.costPerHectare ?? '0',
  };
}

export function Prices() {
  const [matrix, setMatrix] = useState<PriceMatrixItem[]>([]);
  const [rows, setRows] = useState<Record<string, EditableRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyOpenFor, setHistoryOpenFor] = useState<PriceMatrixItem | null>(null);
  const [history, setHistory] = useState<PriceQuote[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await priceQuotesService.currentMatrix();
      setMatrix(data);
      setRows(Object.fromEntries(data.map((item) => [item.activity.id, toRow(item)])));
    } catch {
      toast.error('Não foi possível carregar a matriz de preços.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const groups = useMemo(() => {
    const byCategory = new Map<string, PriceMatrixItem[]>();
    for (const item of matrix) {
      const list = byCategory.get(item.activity.category) ?? [];
      list.push(item);
      byCategory.set(item.activity.category, list);
    }
    return ACTIVITY_CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => ({
      category,
      items: (byCategory.get(category) ?? []).sort((a, b) => a.activity.order - b.activity.order),
    }));
  }, [matrix]);

  function updateRow(activityId: string, field: 'unit' | 'unitPrice' | 'costPerHectare', value: string) {
    setRows((current) => {
      const currentRow = current[activityId];
      if (!currentRow) return current;
      return { ...current, [activityId]: { ...currentRow, [field]: value } };
    });
  }

  async function save() {
    const changed: PriceQuoteItemInput[] = [];
    for (const item of matrix) {
      const row = rows[item.activity.id];
      if (!row) continue;
      const original = toRow(item);
      const hasChanged =
        row.unit !== original.unit ||
        Number(row.unitPrice) !== Number(original.unitPrice) ||
        Number(row.costPerHectare) !== Number(original.costPerHectare);
      if (hasChanged) {
        changed.push({
          activityId: item.activity.id,
          unit: row.unit,
          unitPrice: Number(row.unitPrice),
          costPerHectare: Number(row.costPerHectare),
        });
      }
    }

    if (changed.length === 0) {
      toast.info('Nenhuma alteração para salvar.');
      return;
    }

    setSaving(true);
    try {
      await priceQuotesService.save(changed);
      toast.success(`${changed.length} cotação(ões) atualizada(s).`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar as cotações.');
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(item: PriceMatrixItem) {
    setHistoryOpenFor(item);
    try {
      const { history: data } = await priceQuotesService.history(item.activity.id);
      setHistory(data);
    } catch {
      toast.error('Não foi possível carregar o histórico.');
    }
  }

  async function onImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = await priceQuotesService.import(file);
      toast.success(
        `${result.updated} cotação(ões) importada(s).`,
        result.skipped.length > 0 ? `${result.skipped.length} linha(s) ignorada(s).` : undefined,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Falha ao importar a planilha.');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <Card className="overflow-hidden">
          <SkeletonTable rows={5} columns={5} />
        </Card>
        <Card className="overflow-hidden">
          <SkeletonTable rows={5} columns={5} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preços & Custos"
        description="Matriz de referência das 15 atividades — atualize aqui e todo projeto novo já nasce com o valor certo."
        actions={
          <>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => void onImport(e)} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={() => void priceQuotesService.export()}>
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
            <Button size="sm" onClick={() => void save()} loading={saving}>
              <Save className="h-3.5 w-3.5" />
              Salvar novas cotações
            </Button>
          </>
        }
      />

      {groups.map((group) => (
        <Card key={group.category} className="overflow-hidden">
          <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {ACTIVITY_CATEGORY_LABEL[group.category]}
            </h2>
          </div>
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Preço Unitário (R$)</TableHead>
                <TableHead className="text-right">Custo/ha (R$)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.items.map((item) => {
                const row = rows[item.activity.id];
                if (!row) return null;
                return (
                  <TableRow key={item.activity.id}>
                    <TableCell className="font-medium">{item.activity.name}</TableCell>
                    <TableCell>
                      <Select
                        value={row.unit}
                        onChange={(next) => updateRow(item.activity.id, 'unit', next)}
                        containerClassName="w-40"
                        size="sm"
                        options={item.activity.allowedUnits.map((u) => ({
                          value: u,
                          label: unitLabel(u),
                        }))}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.unitPrice}
                        onChange={(e) => updateRow(item.activity.id, 'unitPrice', e.target.value)}
                        className="ml-auto h-8 w-28 text-right font-mono tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.costPerHectare}
                        onChange={(e) => updateRow(item.activity.id, 'costPerHectare', e.target.value)}
                        className="ml-auto h-8 w-28 text-right font-mono tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void openHistory(item)}
                        className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                        aria-label={`Histórico de ${item.activity.name}`}
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ))}

      <Dialog
        open={!!historyOpenFor}
        onClose={() => setHistoryOpenFor(null)}
        title={`Histórico — ${historyOpenFor?.activity.name ?? ''}`}
        description="Cotações anteriores, mais recente primeiro"
        size="sm"
      >
        {history.length === 0 ? (
          <p className="text-sm text-text-secondary">Sem histórico registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-mono font-medium tabular-nums text-text">
                    {formatCurrency(h.unitPrice)} / {unitLabel(h.unit)}
                  </p>
                  <p className="text-xs text-text-secondary">Custo/ha: {formatCurrency(h.costPerHectare)}</p>
                </div>
                <Badge tone="neutral">{formatDateTime(h.effectiveFrom)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
