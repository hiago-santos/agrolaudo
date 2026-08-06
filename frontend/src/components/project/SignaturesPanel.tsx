import { Check, Copy, Link as LinkIcon, PenLine } from 'lucide-react';
import { useRef, useState } from 'react';

import { SignaturePad, type SignaturePadHandle } from './SignaturePad';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { signaturesService } from '@/services/signatures';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { Project, SignatureType } from '@/types/domain';

interface SignaturesPanelProps {
  project: Project;
  onUpdated: () => void;
}

const TYPE_LABEL: Record<SignatureType, string> = {
  AGRONOMIST: 'Engenheiro Agrônomo Responsável Técnico',
  PRODUCER: 'Produtor Rural',
};

export function SignaturesPanel({ project, onUpdated }: SignaturesPanelProps) {
  const canSign = useAuthStore((s) => s.hasRole('ADMIN', 'AGRONOMIST'));

  if (project.status === 'CANCELLED') {
    return (
      <Card className="p-5 text-sm text-text-secondary">
        Projeto cancelado — assinaturas não se aplicam.
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(['AGRONOMIST', 'PRODUCER'] as const).map((type) => (
        <SignatureBlock
          key={type}
          type={type}
          project={project}
          canSign={canSign}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}

function SignatureBlock({
  type,
  project,
  canSign,
  onUpdated,
}: {
  type: SignatureType;
  project: Project;
  canSign: boolean;
  onUpdated: () => void;
}) {
  const signature = project.signatures.find((s) => s.type === type);
  const alreadySigned = !!signature?.signedAt;
  const padRef = useRef<SignaturePadHandle>(null);
  const [sending, setSending] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const signatoryName = type === 'AGRONOMIST' ? project.agronomist.name : project.producer.name;
  const document =
    type === 'AGRONOMIST' ? project.agronomist.licenseNumber : project.producer.taxId;

  async function confirmSignature() {
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error('Desenhe a assinatura antes de confirmar.');
      return;
    }
    setSending(true);
    try {
      await signaturesService.collect(project.id, type, padRef.current.toDataURL());
      toast.success(`Assinatura de ${signatoryName} registrada.`);
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível registrar a assinatura.');
    } finally {
      setSending(false);
    }
  }

  async function generateLink() {
    setGeneratingLink(true);
    try {
      const result = await signaturesService.generateLink(project.id, type);
      setLink(result.link);
      toast.success('Link de assinatura gerado.', 'Copie e envie para o signatário.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o link.');
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyLink() {
    if (!link) return;
    void navigator.clipboard.writeText(link);
    toast.info('Link copiado.');
  }

  return (
    <Card className="space-y-3 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {TYPE_LABEL[type]}
        </p>
        <p className="text-sm font-medium text-text">{signatoryName}</p>
        <p className="text-xs text-text-secondary">{document}</p>
      </div>

      {alreadySigned ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs text-success">
          <Check className="h-4 w-4 shrink-0" />
          <span>
            Assinado em {formatDateTime(signature?.signedAt)}
            {signature?.hash ? ` · Hash ${signature.hash}` : ''}
          </span>
        </div>
      ) : canSign ? (
        <div className="space-y-2">
          <SignaturePad ref={padRef} label="Assinar na tela" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void confirmSignature()} loading={sending}>
              <PenLine className="h-3.5 w-3.5" />
              Confirmar assinatura
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void generateLink()}
              loading={generatingLink}
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
                onClick={copyLink}
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
