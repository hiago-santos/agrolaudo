import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Input';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { ACTIVITY_CATEGORY_LABEL, ACTIVITY_CATEGORY_ORDER } from '@/lib/activity-categories';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { unitLabel } from '@/lib/units';
import { activitiesService } from '@/services/activities';
import { priceQuotesService } from '@/services/price-quotes';
import { projectsService, type ProjectItemInput } from '@/services/projects';
import type { ProjectCalculationResult } from '@/types/domain';
import type { ItemDraft, ProjectDraft } from '@/types/projectDraft';

interface Step2Props {
  draft: ProjectDraft;
  onChange: (patch: Partial<ProjectDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Activities({ draft, onChange, onNext, onBack }: Step2Props) {
  const [loading, setLoading] = useState(Object.keys(draft.items).length === 0);
  const [result, setResult] = useState<ProjectCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (Object.keys(draft.items).length > 0) {
      setLoading(false);
      return;
    }
    (async () => {
      const [activities, matrix] = await Promise.all([
        activitiesService.list({ active: true }),
        priceQuotesService.currentMatrix(),
      ]);
      const quoteByActivity = new Map(matrix.map((m) => [m.activity.id, m.currentQuote]));
      const items: Record<string, ItemDraft> = {};
      for (const activity of activities) {
        const quote = quoteByActivity.get(activity.id);
        items[activity.id] = {
          selected: false,
          activity,
          unit: quote?.unit ?? activity.defaultUnit,
          areaHectares: '',
          productivity: '',
          unitPrice: quote?.unitPrice ?? '0',
          costPerHectare: quote?.costPerHectare ?? '0',
          herdHeadCount: '',
        };
      }
      onChange({ items });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allActivities = useMemo(
    () => Object.values(draft.items).sort((a, b) => a.activity.order - b.activity.order),
    [draft.items],
  );
  const selected = useMemo(() => allActivities.filter((i) => i.selected), [allActivities]);

  const groups = useMemo(() => {
    const byCategory = new Map<string, ItemDraft[]>();
    for (const item of allActivities) {
      const list = byCategory.get(item.activity.category) ?? [];
      list.push(item);
      byCategory.set(item.activity.category, list);
    }
    return ACTIVITY_CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => ({
      category,
      items: byCategory.get(category) ?? [],
    }));
  }, [allActivities]);

  // Recalcula ao vivo (debounced) via /projects/calculate — o MESMO motor usado na
  // persistência, então o rodapé nunca mostra número diferente do que vai ser salvo.
  const calculationKey = JSON.stringify(
    selected.map((i) => [
      i.activity.id,
      i.unit,
      i.areaHectares,
      i.productivity,
      i.unitPrice,
      i.costPerHectare,
      i.herdHeadCount,
    ]),
  );

  useEffect(() => {
    if (selected.length === 0) {
      setResult(null);
      return;
    }
    const timeout = setTimeout(() => {
      setCalculating(true);
      const itemsInput: ProjectItemInput[] = selected.map((item) => ({
        activityId: item.activity.id,
        unit: item.unit,
        areaHectares: Number(item.areaHectares || 0),
        productivity: Number(item.productivity || 0),
        unitPrice: Number(item.unitPrice || 0),
        costPerHectare: Number(item.costPerHectare || 0),
        herdHeadCount: item.activity.isLivestock ? Number(item.herdHeadCount || 0) : undefined,
      }));
      projectsService
        .calculate(itemsInput)
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setCalculating(false));
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationKey]);

  function toggleSelection(activityId: string) {
    const current = draft.items[activityId];
    if (!current) return;
    onChange({ items: { ...draft.items, [activityId]: { ...current, selected: !current.selected } } });
  }

  function updateItem(activityId: string, patch: Partial<ItemDraft>) {
    const current = draft.items[activityId];
    if (!current) return;
    onChange({ items: { ...draft.items, [activityId]: { ...current, ...patch } } });
  }

  const resultByActivity = new Map(result?.items.map((i) => [i.activityId, i]) ?? []);
  const canAdvance = selected.length > 0 && !!result;

  if (loading) {
    return (
      <Card className="p-5">
        <SkeletonText lines={2} />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'a1',
            'a2',
            'a3',
            'a4',
            'a5',
            'a6',
            'a7',
            'a8',
            'a9',
          ].map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <Card className="p-5">
        <Label>Selecione as atividades da safra</Label>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.category}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {ACTIVITY_CATEGORY_LABEL[group.category]}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <label
                    key={item.activity.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-bg-subtle/60 has-[:checked]:border-accent/40 has-[:checked]:bg-accent-soft"
                  >
                    <Checkbox
                      checked={item.selected}
                      onChange={() => toggleSelection(item.activity.id)}
                    />
                    <span className="min-w-0 leading-snug text-text">{item.activity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selected.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-text">Detalhamento das atividades selecionadas</p>
          {selected.map((item) => {
            const calculated = resultByActivity.get(item.activity.id);
            return (
              <Card key={item.activity.id} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-text">{item.activity.name}</p>
                  {calculated && (
                    <span className="text-sm font-semibold text-accent">
                      {formatCurrency(calculated.netProfit)} líquido
                    </span>
                  )}
                </div>

                <div
                  className={`grid gap-3 ${item.activity.isLivestock ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}
                >
                  <NumberField
                    label="Área (ha)"
                    value={item.areaHectares}
                    onChange={(v) => updateItem(item.activity.id, { areaHectares: v })}
                  />
                  <NumberField
                    label={`Produtividade (${unitLabel(item.unit)}/ha)`}
                    value={item.productivity}
                    onChange={(v) => updateItem(item.activity.id, { productivity: v })}
                  />
                  <NumberField
                    label="Preço Unit. (R$)"
                    value={item.unitPrice}
                    onChange={(v) => updateItem(item.activity.id, { unitPrice: v })}
                  />
                  <NumberField
                    label="Custo/ha (R$)"
                    value={item.costPerHectare}
                    onChange={(v) => updateItem(item.activity.id, { costPerHectare: v })}
                  />
                  {item.activity.isLivestock && (
                    <NumberField
                      label="Rebanho (cabeças)"
                      value={item.herdHeadCount}
                      onChange={(v) => updateItem(item.activity.id, { herdHeadCount: v })}
                    />
                  )}
                </div>

                {calculated && (
                  <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs text-text-secondary sm:grid-cols-3">
                    <span>Produção: {calculated.totalProduction}</span>
                    <span>Faturamento: {formatCurrency(calculated.grossRevenue)}</span>
                    <span>Custo: {formatCurrency(calculated.totalCost)}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:pl-[var(--sidebar-width)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:flex sm:gap-6">
            <Summary
              label="Faturamento"
              value={result ? formatCurrency(result.consolidated.totalRevenue) : '—'}
            />
            <Summary label="Custo" value={result ? formatCurrency(result.consolidated.totalCost) : '—'} />
            <Summary
              label="Receita Líquida"
              value={result ? formatCurrency(result.consolidated.totalProfit) : '—'}
              highlight
            />
            <Summary
              label="Margem"
              value={result ? formatPercentage(result.consolidated.profitMarginPercentage) : '—'}
            />
          </div>
          <div className="flex items-center gap-2">
            {calculating && <Spinner className="h-3.5 w-3.5" />}
            <Button variant="outline" onClick={onBack}>
              Voltar
            </Button>
            <Button onClick={onNext} disabled={!canAdvance}>
              Próximo: Revisão
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 font-mono text-sm tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
      />
    </div>
  );
}

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={highlight ? 'text-sm font-semibold text-accent' : 'text-sm font-medium text-text'}>{value}</p>
    </div>
  );
}
