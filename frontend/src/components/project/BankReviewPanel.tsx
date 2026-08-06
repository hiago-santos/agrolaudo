import {
  CheckCircle2,
  ClipboardEdit,
  Clock,
  Copy,
  Landmark,
  Link as LinkIcon,
  Send,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { reviewService } from '@/services/review';
import { toast } from '@/stores/toast';
import type { Project, ProjectMessage } from '@/types/domain';

interface BankReviewPanelProps {
  project: Project;
  canReview: boolean;
  canAdjust: boolean;
  onUpdated: () => void;
}

function publicProjectLink(project: Project): string | null {
  if (!project.producerAccessToken) return null;
  return `${window.location.origin}/project/${project.id}?token=${project.producerAccessToken}`;
}

function messageLabel(message: ProjectMessage): string {
  if (message.kind === 'BANK_REQUEST') return 'Pedido de ajuste';
  return 'Reenviado para análise';
}

function MessageHistory({ messages }: { messages: ProjectMessage[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Histórico de ajustes
      </p>
      <ul className="space-y-2">
        {messages.map((message) => (
          <li
            key={message.id}
            className="rounded-lg border border-border bg-bg-subtle/40 px-3 py-2.5"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
              <p className="text-xs font-medium text-text">
                {messageLabel(message)} · {message.authorName}
              </p>
              <p className="text-[11px] text-text-tertiary">{formatDateTime(message.createdAt)}</p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-text-secondary">{message.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PublicLinkBlock({
  project,
  canCopy,
}: {
  project: Project;
  canCopy: boolean;
}) {
  const [link, setLink] = useState<string | null>(() => publicProjectLink(project));
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function ensureLink() {
    setLoading(true);
    try {
      const result = await reviewService.getPublicLink(project.id);
      setLink(result.link);
      return result.link;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o link.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    const target = link ?? (await ensureLink());
    if (!target) return;
    void navigator.clipboard.writeText(target);
    setCopied(true);
    toast.info('Link copiado.');
    setTimeout(() => setCopied(false), 2000);
  }

  if (!canCopy) return null;

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-text-tertiary" />
        <p className="text-sm font-medium text-text">Link público do projeto</p>
      </div>
      <p className="text-xs text-text-tertiary">
        Envie ao produtor para consultar o laudo e o resultado da análise de crédito.
      </p>
      {link && (
        <div className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-2 text-xs text-text-secondary">
          <span className="line-clamp-2 break-all">{link}</span>
        </div>
      )}
      <Button variant="secondary" size="sm" onClick={() => void copyLink()} loading={loading}>
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copiado' : link ? 'Copiar link' : 'Gerar e copiar link'}
      </Button>
    </div>
  );
}

/** Decisão de crédito, ajustes e link público do projeto. */
export function BankReviewPanel({
  project,
  canReview,
  canAdjust,
  onUpdated,
}: BankReviewPanelProps) {
  const [creditLimit, setCreditLimit] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustmentMessage, setAdjustmentMessage] = useState('');
  const [resubmitNote, setResubmitNote] = useState('');
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState(false);
  const [requestingAdjustment, setRequestingAdjustment] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  const messages = project.messages ?? [];

  if (project.status === 'APPROVED' || project.status === 'REJECTED') {
    const approved = project.status === 'APPROVED';
    return (
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          {approved ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-danger" />
          )}
          <p className="text-sm font-semibold text-text">
            {approved ? 'Crédito aprovado pelo banco' : 'Crédito reprovado pelo banco'}
          </p>
        </div>
        {approved && project.approvedCreditLimit && (
          <p className="text-sm text-text-secondary">
            Limite aprovado:{' '}
            <span className="font-medium text-text">
              {formatCurrency(project.approvedCreditLimit)}
            </span>
          </p>
        )}
        {project.bankNotes && <p className="text-sm text-text-secondary">{project.bankNotes}</p>}
        <p className="text-xs text-text-tertiary">
          {project.bankReviewer?.name ? `${project.bankReviewer.name} · ` : ''}
          {formatDateTime(project.bankReviewedAt)}
        </p>
        <MessageHistory messages={messages} />
        <PublicLinkBlock project={project} canCopy={canReview || canAdjust} />
      </Card>
    );
  }

  if (project.status === 'AWAITING_PRODUCER_INFO') {
    async function resubmit() {
      setResubmitting(true);
      try {
        await reviewService.resubmit(project.id, resubmitNote.trim() || undefined);
        toast.success('Projeto reenviado para análise do banco.');
        onUpdated();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Não foi possível reenviar o projeto.');
      } finally {
        setResubmitting(false);
      }
    }

    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-text">Projeto em ajuste</p>
        </div>

        <p className="text-sm text-text-secondary">
          O banco solicitou alterações. O agrônomo (ou o banco) deve ajustar o projeto e reenviá-lo
          para análise.
        </p>

        <MessageHistory messages={messages} />

        {canAdjust && (
          <Link
            to={`/projects/${project.id}/adjust`}
            className={buttonVariants('secondary', 'sm')}
          >
            <ClipboardEdit className="h-4 w-4" />
            Ajustar atividades
          </Link>
        )}

        {(canAdjust || canReview) && (
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="resubmitNote">Observação ao reenviar (opcional)</Label>
            <Textarea
              id="resubmitNote"
              value={resubmitNote}
              onChange={(e) => setResubmitNote(e.target.value)}
              placeholder="Resumo das alterações realizadas..."
            />
            <div className="flex justify-end">
              <Button onClick={() => void resubmit()} loading={resubmitting}>
                <Send className="h-4 w-4" />
                Reenviar para análise
              </Button>
            </div>
          </div>
        )}

        {!canAdjust && !canReview && (
          <p className="text-xs text-text-tertiary">
            Aguardando ajustes do agrônomo responsável pelo projeto.
          </p>
        )}
      </Card>
    );
  }

  if (project.status !== 'UNDER_BANK_REVIEW') {
    return null;
  }

  async function decide(decision: 'APPROVED' | 'REJECTED') {
    setSubmitting(decision);
    try {
      const result = await reviewService.submit(project.id, {
        decision,
        creditLimit: decision === 'APPROVED' ? Number(creditLimit || 0) : undefined,
        notes: notes || undefined,
      });
      void navigator.clipboard.writeText(result.publicLink);
      toast.success(
        decision === 'APPROVED' ? 'Crédito aprovado.' : 'Crédito reprovado.',
        'Link público copiado — envie ao produtor.',
      );
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível registrar a decisão.');
    } finally {
      setSubmitting(null);
    }
  }

  async function requestAdjustment() {
    if (!adjustmentMessage.trim()) {
      toast.error('Descreva o que precisa ser ajustado.');
      return;
    }
    setRequestingAdjustment(true);
    try {
      await reviewService.requestAdjustment(project.id, adjustmentMessage.trim());
      toast.success('Projeto devolvido para ajustes.');
      setAdjustmentMessage('');
      setAdjustmentMode(false);
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível solicitar ajustes.');
    } finally {
      setRequestingAdjustment(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold text-text">Análise de crédito</p>
      </div>

      <MessageHistory messages={messages} />

      {!canReview ? (
        <p className="text-xs text-text-tertiary">Este projeto está em análise pelo banco.</p>
      ) : adjustmentMode ? (
        <>
          <div>
            <Label htmlFor="adjustmentMessage">O que precisa ser ajustado?</Label>
            <Textarea
              id="adjustmentMessage"
              value={adjustmentMessage}
              onChange={(e) => setAdjustmentMessage(e.target.value)}
              placeholder="Atividades, valores, área financiada, documentação..."
              autoFocus
            />
          </div>
          <p className="text-xs text-text-tertiary">
            O agrônomo (ou o banco) poderá editar o projeto antes de reenviá-lo para análise.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAdjustmentMode(false);
                setAdjustmentMessage('');
              }}
              disabled={requestingAdjustment}
            >
              Voltar
            </Button>
            <Button
              onClick={() => void requestAdjustment()}
              loading={requestingAdjustment}
              disabled={requestingAdjustment}
            >
              <ClipboardEdit className="h-4 w-4" />
              Confirmar ajustes
            </Button>
          </div>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="creditLimit">Limite de crédito aprovado (R$)</Label>
            <input
              id="creditLimit"
              type="number"
              step="0.01"
              min="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="0,00"
              className="h-9 w-full rounded-lg border border-border-strong bg-surface px-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
            />
          </div>
          <div>
            <Label htmlFor="bankNotes">Observações (opcional)</Label>
            <Textarea
              id="bankNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Justificativa, condições, ressalvas..."
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="danger"
              onClick={() => void decide('REJECTED')}
              loading={submitting === 'REJECTED'}
              disabled={!!submitting}
            >
              <XCircle className="h-4 w-4" />
              Reprovar
            </Button>
            <Button variant="secondary" onClick={() => setAdjustmentMode(true)} disabled={!!submitting}>
              <ClipboardEdit className="h-4 w-4" />
              Solicitar ajustes
            </Button>
            <Button
              onClick={() => void decide('APPROVED')}
              loading={submitting === 'APPROVED'}
              disabled={!!submitting}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprovar crédito
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
