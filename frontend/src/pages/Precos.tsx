import { Download, History, Save, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ApiError } from '@/lib/api';
import { CATEGORIA_LABEL, CATEGORIA_ORDEM } from '@/lib/categorias';
import { formatarDataHora, formatarMoeda } from '@/lib/format';
import { rotuloUnidade } from '@/lib/unidades';
import { cotacoesService, type ItemCotacaoInput } from '@/services/cotacoes';
import { toast } from '@/stores/toast';
import type { CotacaoRef, MatrizItem } from '@/types/domain';

interface LinhaEditavel {
  atividadeId: string;
  unidade: string;
  precoUnitario: string;
  custoPorHa: string;
}

function paraLinha(item: MatrizItem): LinhaEditavel {
  return {
    atividadeId: item.atividade.id,
    unidade: item.cotacaoAtual?.unidade ?? item.atividade.unidadePadrao,
    precoUnitario: item.cotacaoAtual?.precoUnitario ?? '0',
    custoPorHa: item.cotacaoAtual?.custoPorHa ?? '0',
  };
}

export function Precos() {
  const [matriz, setMatriz] = useState<MatrizItem[]>([]);
  const [linhas, setLinhas] = useState<Record<string, LinhaEditavel>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState<MatrizItem | null>(null);
  const [historico, setHistorico] = useState<CotacaoRef[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setLoading(true);
    try {
      const data = await cotacoesService.matrizAtual();
      setMatriz(data);
      setLinhas(Object.fromEntries(data.map((item) => [item.atividade.id, paraLinha(item)])));
    } catch {
      toast.error('Não foi possível carregar a matriz de preços.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const grupos = useMemo(() => {
    const porCategoria = new Map<string, MatrizItem[]>();
    for (const item of matriz) {
      const lista = porCategoria.get(item.atividade.categoria) ?? [];
      lista.push(item);
      porCategoria.set(item.atividade.categoria, lista);
    }
    return CATEGORIA_ORDEM.filter((c) => porCategoria.has(c)).map((categoria) => ({
      categoria,
      itens: (porCategoria.get(categoria) ?? []).sort((a, b) => a.atividade.ordem - b.atividade.ordem),
    }));
  }, [matriz]);

  function atualizarLinha(atividadeId: string, campo: 'unidade' | 'precoUnitario' | 'custoPorHa', valor: string) {
    setLinhas((atual) => {
      const linhaAtual = atual[atividadeId];
      if (!linhaAtual) return atual;
      const linhaAtualizada: LinhaEditavel = { ...linhaAtual, [campo]: valor };
      return { ...atual, [atividadeId]: linhaAtualizada };
    });
  }

  async function salvar() {
    const alterados: ItemCotacaoInput[] = [];
    for (const item of matriz) {
      const linha = linhas[item.atividade.id];
      if (!linha) continue;
      const original = paraLinha(item);
      const mudou =
        linha.unidade !== original.unidade ||
        Number(linha.precoUnitario) !== Number(original.precoUnitario) ||
        Number(linha.custoPorHa) !== Number(original.custoPorHa);
      if (mudou) {
        alterados.push({
          atividadeId: item.atividade.id,
          unidade: linha.unidade,
          precoUnitario: Number(linha.precoUnitario),
          custoPorHa: Number(linha.custoPorHa),
        });
      }
    }

    if (alterados.length === 0) {
      toast.info('Nenhuma alteração para salvar.');
      return;
    }

    setSalvando(true);
    try {
      await cotacoesService.salvar(alterados);
      toast.success(`${alterados.length} cotação(ões) atualizada(s).`);
      await carregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar as cotações.');
    } finally {
      setSalvando(false);
    }
  }

  async function abrirHistorico(item: MatrizItem) {
    setHistoricoAberto(item);
    try {
      const { historico: dados } = await cotacoesService.historico(item.atividade.id);
      setHistorico(dados);
    } catch {
      toast.error('Não foi possível carregar o histórico.');
    }
  }

  async function onImportar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const resultado = await cotacoesService.importar(file);
      toast.success(
        `${resultado.atualizados} cotação(ões) importada(s).`,
        resultado.ignorados.length > 0 ? `${resultado.ignorados.length} linha(s) ignorada(s).` : undefined,
      );
      await carregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Falha ao importar a planilha.');
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preços & Custos"
        description="Matriz de referência das 15 atividades — atualize aqui e todo laudo novo já nasce com o valor certo."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => void onImportar(e)}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={() => void cotacoesService.exportar()}>
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
            <Button size="sm" onClick={() => void salvar()} loading={salvando}>
              <Save className="h-3.5 w-3.5" />
              Salvar Novas Cotações
            </Button>
          </>
        }
      />

      {grupos.map((grupo) => (
        <Card key={grupo.categoria} className="overflow-hidden">
          <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {CATEGORIA_LABEL[grupo.categoria]}
            </h2>
          </div>
          <Table>
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
              {grupo.itens.map((item) => {
                const linha = linhas[item.atividade.id];
                if (!linha) return null;
                return (
                  <TableRow key={item.atividade.id}>
                    <TableCell className="font-medium">{item.atividade.nome}</TableCell>
                    <TableCell>
                      <Select
                        value={linha.unidade}
                        onChange={(e) => atualizarLinha(item.atividade.id, 'unidade', e.target.value)}
                        className="h-8 w-40 text-xs"
                      >
                        {item.atividade.unidadesPermitidas.map((u) => (
                          <option key={u} value={u}>
                            {rotuloUnidade(u)}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={linha.precoUnitario}
                        onChange={(e) => atualizarLinha(item.atividade.id, 'precoUnitario', e.target.value)}
                        className="h-8 w-28 rounded-md border border-border-strong bg-surface px-2 text-right text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={linha.custoPorHa}
                        onChange={(e) => atualizarLinha(item.atividade.id, 'custoPorHa', e.target.value)}
                        className="h-8 w-28 rounded-md border border-border-strong bg-surface px-2 text-right text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => void abrirHistorico(item)}
                        className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-subtle hover:text-accent"
                        aria-label={`Histórico de ${item.atividade.nome}`}
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
        open={!!historicoAberto}
        onClose={() => setHistoricoAberto(null)}
        title={`Histórico — ${historicoAberto?.atividade.nome ?? ''}`}
        description="Cotações anteriores, mais recente primeiro"
      >
        {historico.length === 0 ? (
          <p className="text-sm text-text-secondary">Sem histórico registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {historico.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-text">
                    {formatarMoeda(h.precoUnitario)} / {rotuloUnidade(h.unidade)}
                  </p>
                  <p className="text-xs text-text-secondary">Custo/ha: {formatarMoeda(h.custoPorHa)}</p>
                </div>
                <Badge tone="neutral">{formatarDataHora(h.vigenteDesde)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
