import { ChevronLeft, ChevronRight, FileStack, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatarData, formatarMoeda } from '@/lib/format';
import { laudosService } from '@/services/laudos';
import { toast } from '@/stores/toast';
import type { LaudoResumo, StatusLaudo } from '@/types/domain';

const STATUS_TONE: Record<StatusLaudo, BadgeTone> = {
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

const PAGE_SIZE = 15;

export function Historico() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusLaudo | ''>('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LaudoResumo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const resultado = await laudosService.listar({
        busca: busca || undefined,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(resultado.items);
      setTotal(resultado.total);
    } catch {
      toast.error('Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void carregar(), busca ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, page]);

  useEffect(() => {
    setPage(1);
  }, [busca, status]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico" description="Todos os laudos emitidos — busque, filtre e reabra qualquer um." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por produtor, CPF, fazenda ou número..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusLaudo | '')}
          className="sm:w-56"
        >
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="AGUARDANDO_ASSINATURA">Aguardando assinatura</option>
          <option value="ASSINADO">Assinado</option>
          <option value="CANCELADO">Cancelado</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FileStack}
              title="Nenhum laudo encontrado"
              description="Ajuste a busca/filtro ou emita um novo laudo."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Produtor</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Safra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead>Emitido em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((laudo) => (
                  <TableRow key={laudo.id}>
                    <TableCell className="font-medium">
                      <Link to={`/laudos/${laudo.id}`} className="hover:text-accent hover:underline">
                        {laudo.numero}
                      </Link>
                    </TableCell>
                    <TableCell>{laudo.produtor.nome}</TableCell>
                    <TableCell className="text-text-secondary">{laudo.propriedade.nome}</TableCell>
                    <TableCell className="text-text-secondary">{laudo.safra.rotulo}</TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[laudo.status]}>{STATUS_LABEL[laudo.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatarMoeda(laudo.totalFaturamento)}
                    </TableCell>
                    <TableCell className="text-text-secondary">{formatarData(laudo.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-text-secondary">
              <span>
                {total} laudo{total === 1 ? '' : 's'} · página {page} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPaginas}
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
