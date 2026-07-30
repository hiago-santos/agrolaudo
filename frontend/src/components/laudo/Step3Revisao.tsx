import { CheckCircle2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { AssinaturasPainel } from '@/components/laudo/AssinaturasPainel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api';
import { draftParaLaudoInput } from '@/lib/laudoDraft';
import { laudosService } from '@/services/laudos';
import { toast } from '@/stores/toast';
import type { Laudo } from '@/types/domain';
import type { LaudoDraft } from '@/types/laudoDraft';

interface Step3Props {
  draft: LaudoDraft;
  onChange: (patch: Partial<LaudoDraft>) => void;
  onBack: () => void;
}

export function Step3Revisao({ draft, onChange, onBack }: Step3Props) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [carregandoPreview, setCarregandoPreview] = useState(true);
  const [emitindo, setEmitindo] = useState(false);
  const [laudo, setLaudo] = useState<Laudo | null>(null);

  useEffect(() => {
    setCarregandoPreview(true);
    laudosService
      .previewNovo(draftParaLaudoInput(draft))
      .then(setPreviewHtml)
      .catch(() => toast.error('Não foi possível gerar a prévia do documento.'))
      .finally(() => setCarregandoPreview(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function emitir() {
    setEmitindo(true);
    try {
      const criado = await laudosService.criar(draftParaLaudoInput(draft));
      setLaudo(criado);
      setPreviewHtml(await laudosService.previewExistente(criado.id));
      toast.success(`Laudo ${criado.numero} emitido.`, 'Colete as assinaturas abaixo ou envie o link.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível emitir o laudo.');
    } finally {
      setEmitindo(false);
    }
  }

  async function recarregarLaudo() {
    if (!laudo) return;
    const [atualizado, html] = await Promise.all([
      laudosService.obter(laudo.id),
      laudosService.previewExistente(laudo.id),
    ]);
    setLaudo(atualizado);
    setPreviewHtml(html);
  }

  if (laudo) {
    return (
      <div className="space-y-6">
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-base font-semibold text-text">Laudo {laudo.numero} emitido</p>
            <p className="mt-1 text-sm text-text-secondary">
              Colete as assinaturas abaixo (na tela ou por link) ou baixe os documentos.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => void laudosService.baixarXlsx(laudo.id, laudo.numero)}>
              <FileSpreadsheet className="h-4 w-4" />
              Baixar XLSX
            </Button>
            <Button variant="outline" onClick={() => void laudosService.baixarPdf(laudo.id, laudo.numero)}>
              <FileText className="h-4 w-4" />
              Baixar PDF
            </Button>
            <Link to="/" className="inline-flex">
              <Button variant="ghost">Ir para o Dashboard</Button>
            </Link>
          </div>
        </Card>

        <div>
          <p className="mb-3 text-sm font-semibold text-text">Assinaturas</p>
          <AssinaturasPainel laudo={laudo} onAtualizado={() => void recarregarLaudo()} />
        </div>

        <Card className="overflow-hidden">
          <iframe title={`Laudo ${laudo.numero}`} srcDoc={previewHtml} className="h-[600px] w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Label htmlFor="observacoes">Observações (opcional)</Label>
        <Textarea
          id="observacoes"
          value={draft.observacoes}
          onChange={(e) => onChange({ observacoes: e.target.value })}
          placeholder="Informações adicionais para constar no laudo..."
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-bg-subtle/50 px-5 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Prévia do documento
          </h2>
        </div>
        {carregandoPreview ? (
          <PageSpinner />
        ) : (
          <iframe title="Prévia do laudo" srcDoc={previewHtml} className="h-[600px] w-full" />
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={() => void emitir()} loading={emitindo}>
          <Download className="h-4 w-4" />
          Concluir e Gerar Laudo
        </Button>
      </div>
    </div>
  );
}
