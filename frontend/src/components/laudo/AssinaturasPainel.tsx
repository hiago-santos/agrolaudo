import { Check, Copy, Link as LinkIcon, PenLine } from 'lucide-react';
import { useRef, useState } from 'react';

import { SignaturePad, type SignaturePadHandle } from './SignaturePad';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api';
import { formatarDataHora } from '@/lib/format';
import { laudosService } from '@/services/laudos';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Laudo, TipoAssinatura } from '@/types/domain';

interface AssinaturasPainelProps {
  laudo: Laudo;
  onAtualizado: () => void;
}

const ROTULO_TIPO: Record<TipoAssinatura, string> = {
  AGRONOMO: 'Engenheiro Agrônomo Responsável Técnico',
  PRODUTOR: 'Produtor Rural',
};

export function AssinaturasPainel({ laudo, onAtualizado }: AssinaturasPainelProps) {
  const podeAssinar = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMO'));

  if (laudo.status === 'CANCELADO') {
    return (
      <Card className="p-5 text-sm text-text-secondary">
        Laudo cancelado — assinaturas não se aplicam.
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(['AGRONOMO', 'PRODUTOR'] as const).map((tipo) => (
        <BlocoAssinatura
          key={tipo}
          tipo={tipo}
          laudo={laudo}
          podeAssinar={podeAssinar}
          onAtualizado={onAtualizado}
        />
      ))}
    </div>
  );
}

function BlocoAssinatura({
  tipo,
  laudo,
  podeAssinar,
  onAtualizado,
}: {
  tipo: TipoAssinatura;
  laudo: Laudo;
  podeAssinar: boolean;
  onAtualizado: () => void;
}) {
  const assinatura = laudo.assinaturas.find((a) => a.tipo === tipo);
  const jaAssinado = !!assinatura?.assinadoEm;
  const padRef = useRef<SignaturePadHandle>(null);
  const [enviando, setEnviando] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const nomeSignatario = tipo === 'AGRONOMO' ? laudo.agronomo.nome : laudo.produtor.nome;
  const documento = tipo === 'AGRONOMO' ? laudo.agronomo.crea : laudo.produtor.cpfCnpj;

  async function confirmarAssinatura() {
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error('Desenhe a assinatura antes de confirmar.');
      return;
    }
    setEnviando(true);
    try {
      await laudosService.assinar(laudo.id, tipo, padRef.current.toDataURL());
      toast.success(`Assinatura de ${nomeSignatario} registrada.`);
      onAtualizado();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível registrar a assinatura.');
    } finally {
      setEnviando(false);
    }
  }

  async function gerarLink() {
    setGerandoLink(true);
    try {
      const resultado = await laudosService.gerarLinkAssinatura(laudo.id, tipo);
      setLink(resultado.link);
      toast.success('Link de assinatura gerado.', 'Copie e envie para o signatário.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o link.');
    } finally {
      setGerandoLink(false);
    }
  }

  function copiarLink() {
    if (!link) return;
    void navigator.clipboard.writeText(link);
    toast.info('Link copiado.');
  }

  return (
    <Card className="space-y-3 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {ROTULO_TIPO[tipo]}
        </p>
        <p className="text-sm font-medium text-text">{nomeSignatario}</p>
        <p className="text-xs text-text-secondary">{documento}</p>
      </div>

      {jaAssinado ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs text-success">
          <Check className="h-4 w-4 shrink-0" />
          <span>
            Assinado em {formatarDataHora(assinatura?.assinadoEm)}
            {assinatura?.hash ? ` · Hash ${assinatura.hash}` : ''}
          </span>
        </div>
      ) : podeAssinar ? (
        <div className="space-y-2">
          <SignaturePad ref={padRef} label="Assinar na tela" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void confirmarAssinatura()} loading={enviando}>
              <PenLine className="h-3.5 w-3.5" />
              Confirmar assinatura
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void gerarLink()}
              loading={gerandoLink}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Gerar link remoto
            </Button>
          </div>
          {link && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-subtle px-2 py-1.5">
              <input
                readOnly
                value={link}
                className="flex-1 truncate bg-transparent text-xs text-text-secondary"
              />
              <button
                type="button"
                onClick={copiarLink}
                className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-surface hover:text-accent"
                aria-label="Copiar link"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-tertiary">Aguardando assinatura.</p>
      )}
    </Card>
  );
}
