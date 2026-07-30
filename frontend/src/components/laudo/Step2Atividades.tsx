import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Input';
import { PageSpinner, Spinner } from '@/components/ui/Spinner';
import { CATEGORIA_LABEL, CATEGORIA_ORDEM } from '@/lib/categorias';
import { formatarMoeda, formatarPercentual } from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';
import { atividadesService } from '@/services/atividades';
import { cotacoesService } from '@/services/cotacoes';
import { laudosService, type ItemLaudoInput } from '@/services/laudos';
import type { CalculoLaudoResultado } from '@/types/domain';
import type { ItemDraft, LaudoDraft } from '@/types/laudoDraft';

interface Step2Props {
  draft: LaudoDraft;
  onChange: (patch: Partial<LaudoDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Atividades({ draft, onChange, onNext, onBack }: Step2Props) {
  const [carregando, setCarregando] = useState(Object.keys(draft.itens).length === 0);
  const [resultado, setResultado] = useState<CalculoLaudoResultado | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    if (Object.keys(draft.itens).length > 0) {
      setCarregando(false);
      return;
    }
    (async () => {
      const [atividades, matriz] = await Promise.all([
        atividadesService.listar({ ativo: true }),
        cotacoesService.matrizAtual(),
      ]);
      const cotacaoPorAtividade = new Map(matriz.map((m) => [m.atividade.id, m.cotacaoAtual]));
      const itens: Record<string, ItemDraft> = {};
      for (const atividade of atividades) {
        const cotacao = cotacaoPorAtividade.get(atividade.id);
        itens[atividade.id] = {
          selecionado: false,
          atividade,
          unidade: cotacao?.unidade ?? atividade.unidadePadrao,
          areaHa: '',
          produtividade: '',
          precoUnitario: cotacao?.precoUnitario ?? '0',
          custoPorHa: cotacao?.custoPorHa ?? '0',
          rebanhoCabecas: '',
        };
      }
      onChange({ itens });
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todasAtividades = useMemo(
    () => Object.values(draft.itens).sort((a, b) => a.atividade.ordem - b.atividade.ordem),
    [draft.itens],
  );
  const selecionados = useMemo(() => todasAtividades.filter((i) => i.selecionado), [todasAtividades]);

  const grupos = useMemo(() => {
    const porCategoria = new Map<string, ItemDraft[]>();
    for (const item of todasAtividades) {
      const lista = porCategoria.get(item.atividade.categoria) ?? [];
      lista.push(item);
      porCategoria.set(item.atividade.categoria, lista);
    }
    return CATEGORIA_ORDEM.filter((c) => porCategoria.has(c)).map((categoria) => ({
      categoria,
      itens: porCategoria.get(categoria) ?? [],
    }));
  }, [todasAtividades]);

  // Recalcula ao vivo (debounced) via /laudos/calcular — o MESMO motor usado na
  // persistência, então o rodapé nunca mostra número diferente do que vai ser salvo.
  const chaveCalculo = JSON.stringify(
    selecionados.map((i) => [i.atividade.id, i.unidade, i.areaHa, i.produtividade, i.precoUnitario, i.custoPorHa, i.rebanhoCabecas]),
  );

  useEffect(() => {
    if (selecionados.length === 0) {
      setResultado(null);
      return;
    }
    const timeout = setTimeout(() => {
      setCalculando(true);
      const itensInput: ItemLaudoInput[] = selecionados.map((item) => ({
        atividadeId: item.atividade.id,
        unidade: item.unidade,
        areaHa: Number(item.areaHa || 0),
        produtividade: Number(item.produtividade || 0),
        precoUnitario: Number(item.precoUnitario || 0),
        custoPorHa: Number(item.custoPorHa || 0),
        rebanhoCabecas: item.atividade.pecuaria ? Number(item.rebanhoCabecas || 0) : undefined,
      }));
      laudosService
        .calcular(itensInput)
        .then(setResultado)
        .catch(() => setResultado(null))
        .finally(() => setCalculando(false));
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCalculo]);

  function alternarSelecao(atividadeId: string) {
    const atual = draft.itens[atividadeId];
    if (!atual) return;
    onChange({ itens: { ...draft.itens, [atividadeId]: { ...atual, selecionado: !atual.selecionado } } });
  }

  function atualizarItem(atividadeId: string, patch: Partial<ItemDraft>) {
    const atual = draft.itens[atividadeId];
    if (!atual) return;
    onChange({ itens: { ...draft.itens, [atividadeId]: { ...atual, ...patch } } });
  }

  const receitaPorAtividade = new Map(resultado?.itens.map((i) => [i.atividadeId, i]) ?? []);
  const podeAvancar = selecionados.length > 0 && !!resultado;

  if (carregando) return <PageSpinner />;

  return (
    <div className="space-y-6 pb-24">
      <Card className="p-5">
        <Label>Selecione as atividades da safra</Label>
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.categoria}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {CATEGORIA_LABEL[grupo.categoria]}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.itens.map((item) => (
                  <label
                    key={item.atividade.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-accent/40 has-[:checked]:bg-accent-soft"
                  >
                    <input
                      type="checkbox"
                      checked={item.selecionado}
                      onChange={() => alternarSelecao(item.atividade.id)}
                      className="h-4 w-4 rounded border-border-strong text-accent focus:ring-accent-ring"
                    />
                    {item.atividade.nome}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selecionados.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-text">Detalhamento das atividades selecionadas</p>
          {selecionados.map((item) => {
            const calculado = receitaPorAtividade.get(item.atividade.id);
            return (
              <Card key={item.atividade.id} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-text">{item.atividade.nome}</p>
                  {calculado && (
                    <span className="text-sm font-semibold text-accent">
                      {formatarMoeda(calculado.receitaLiquida)} líquido
                    </span>
                  )}
                </div>

                <div
                  className={`grid gap-3 ${item.atividade.pecuaria ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}
                >
                  <NumberField
                    label="Área (ha)"
                    value={item.areaHa}
                    onChange={(v) => atualizarItem(item.atividade.id, { areaHa: v })}
                  />
                  <NumberField
                    label={`Produtividade (${rotuloUnidade(item.unidade)}/ha)`}
                    value={item.produtividade}
                    onChange={(v) => atualizarItem(item.atividade.id, { produtividade: v })}
                  />
                  <NumberField
                    label="Preço Unit. (R$)"
                    value={item.precoUnitario}
                    onChange={(v) => atualizarItem(item.atividade.id, { precoUnitario: v })}
                  />
                  <NumberField
                    label="Custo/ha (R$)"
                    value={item.custoPorHa}
                    onChange={(v) => atualizarItem(item.atividade.id, { custoPorHa: v })}
                  />
                  {item.atividade.pecuaria && (
                    <NumberField
                      label="Rebanho (cabeças)"
                      value={item.rebanhoCabecas}
                      onChange={(v) => atualizarItem(item.atividade.id, { rebanhoCabecas: v })}
                    />
                  )}
                </div>

                {calculado && (
                  <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs text-text-secondary sm:grid-cols-3">
                    <span>Produção: {calculado.producaoTotal}</span>
                    <span>Faturamento: {formatarMoeda(calculado.faturamentoBruto)}</span>
                    <span>Custo: {formatarMoeda(calculado.custoTotal)}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-md md:pl-[236px]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:flex sm:gap-6">
            <Resumo
              label="Faturamento"
              valor={resultado ? formatarMoeda(resultado.consolidado.totalFaturamento) : '—'}
            />
            <Resumo label="Custo" valor={resultado ? formatarMoeda(resultado.consolidado.totalCusto) : '—'} />
            <Resumo
              label="Receita Líquida"
              valor={resultado ? formatarMoeda(resultado.consolidado.totalReceita) : '—'}
              destaque
            />
            <Resumo
              label="Margem"
              valor={resultado ? formatarPercentual(resultado.consolidado.margemPercentual) : '—'}
            />
          </div>
          <div className="flex items-center gap-2">
            {calculando && <Spinner className="h-3.5 w-3.5" />}
            <Button variant="outline" onClick={onBack}>
              Voltar
            </Button>
            <Button onClick={onNext} disabled={!podeAvancar}>
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
        className="h-9 w-full rounded-lg border border-border-strong bg-surface px-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
      />
    </div>
  );
}

function Resumo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={destaque ? 'text-sm font-semibold text-accent' : 'text-sm font-medium text-text'}>{valor}</p>
    </div>
  );
}
