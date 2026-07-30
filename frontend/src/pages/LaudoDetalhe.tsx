import { ArrowLeft, Ban, Copy, FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AssinaturasPainel } from '@/components/laudo/AssinaturasPainel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api';
import { formatarMoeda, formatarPercentual } from '@/lib/format';
import { laudosService } from '@/services/laudos';
import { safrasService } from '@/services/safras';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Laudo, Safra, StatusLaudo } from '@/types/domain';

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

export function LaudoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const podeEditar = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMO'));

  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [duplicarAberto, setDuplicarAberto] = useState(false);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [safraDestino, setSafraDestino] = useState('');
  const [duplicando, setDuplicando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  async function carregar() {
    if (!id) return;
    setLoading(true);
    try {
      const [dados, html] = await Promise.all([laudosService.obter(id), laudosService.previewExistente(id)]);
      setLaudo(dados);
      setPreviewHtml(html);
    } catch {
      toast.error('Não foi possível carregar o laudo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function abrirDuplicar() {
    setDuplicarAberto(true);
    if (safras.length === 0) setSafras(await safrasService.listar());
  }

  async function confirmarDuplicar() {
    if (!id || !safraDestino) return;
    setDuplicando(true);
    try {
      const novo = await laudosService.duplicar(id, safraDestino);
      toast.success(`Laudo ${novo.numero} criado a partir deste.`);
      navigate(`/laudos/${novo.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível duplicar o laudo.');
    } finally {
      setDuplicando(false);
      setDuplicarAberto(false);
    }
  }

  async function cancelar() {
    if (!id) return;
    setCancelando(true);
    try {
      await laudosService.cancelar(id);
      toast.success('Laudo cancelado.');
      await carregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível cancelar o laudo.');
    } finally {
      setCancelando(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (!laudo) return null;

  const podeCancelar = podeEditar && laudo.status !== 'CANCELADO' && laudo.status !== 'ASSINADO';

  return (
    <div className="space-y-6">
      <Link
        to="/historico"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o histórico
      </Link>

      <PageHeader
        title={laudo.numero}
        description={`${laudo.produtor.nome} · ${laudo.propriedade.nome} · Safra ${laudo.safra.rotulo}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[laudo.status]}>{STATUS_LABEL[laudo.status]}</Badge>
            <Button variant="outline" size="sm" onClick={() => void laudosService.baixarXlsx(laudo.id, laudo.numero)}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              XLSX
            </Button>
            <Button variant="outline" size="sm" onClick={() => void laudosService.baixarPdf(laudo.id, laudo.numero)}>
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
            {podeEditar && (
              <Button variant="outline" size="sm" onClick={() => void abrirDuplicar()}>
                <Copy className="h-3.5 w-3.5" />
                Duplicar
              </Button>
            )}
            {podeCancelar && (
              <Button variant="danger" size="sm" onClick={() => void cancelar()} loading={cancelando}>
                <Ban className="h-3.5 w-3.5" />
                Cancelar
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Resumo label="Faturamento Bruto" valor={formatarMoeda(laudo.totalFaturamento)} />
        <Resumo label="Custo de Produção" valor={formatarMoeda(laudo.totalCusto)} />
        <Resumo label="Receita Líquida" valor={formatarMoeda(laudo.totalReceita)} destaque />
        <Resumo label="Margem Operacional" valor={formatarPercentual(laudo.margemPercentual)} />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-text">Assinaturas</p>
        <AssinaturasPainel laudo={laudo} onAtualizado={() => void carregar()} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Documento</h2>
        </div>
        <iframe title={`Laudo ${laudo.numero}`} srcDoc={previewHtml} className="h-[600px] w-full" />
      </Card>

      <Dialog open={duplicarAberto} onClose={() => setDuplicarAberto(false)} title="Duplicar laudo para outra safra">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            As áreas e produtividades são reaproveitadas; preço e custo são atualizados com a matriz de
            preços atual.
          </p>
          <Select value={safraDestino} onChange={(e) => setSafraDestino(e.target.value)}>
            <option value="" disabled>
              Selecione a safra de destino
            </option>
            {safras
              .filter((s) => s.id !== laudo.safra.id)
              .map((safra) => (
                <option key={safra.id} value={safra.id}>
                  {safra.rotulo}
                </option>
              ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDuplicarAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmarDuplicar()} disabled={!safraDestino} loading={duplicando}>
              Duplicar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Resumo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className={destaque ? 'mt-1 text-xl font-semibold text-accent' : 'mt-1 text-xl font-semibold text-text'}>
        {valor}
      </p>
    </Card>
  );
}
