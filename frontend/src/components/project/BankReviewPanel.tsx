import { CheckCircle2, Landmark, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { reviewService } from '@/services/review';
import { toast } from '@/stores/toast';
import type { Project } from '@/types/domain';

interface BankReviewPanelProps {
  project: Project;
  canReview: boolean;
  onUpdated: () => void;
}

/** Decisão de crédito do banco — única escrita que o papel BANK realiza (ver plano, ponto 3). */
export function BankReviewPanel({ project, canReview, onUpdated }: BankReviewPanelProps) {
  const [creditLimit, setCreditLimit] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null);

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
      </Card>
    );
  }

  if (project.status !== 'UNDER_BANK_REVIEW') {
    return null;
  }

  async function decide(decision: 'APPROVED' | 'REJECTED') {
    setSubmitting(decision);
    try {
      await reviewService.submit(project.id, {
        decision,
        creditLimit: decision === 'APPROVED' ? Number(creditLimit || 0) : undefined,
        notes: notes || undefined,
      });
      toast.success(decision === 'APPROVED' ? 'Crédito aprovado.' : 'Crédito reprovado.');
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível registrar a decisão.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold text-text">Análise de crédito</p>
      </div>

      {!canReview ? (
        <p className="text-xs text-text-tertiary">Este projeto está em análise pelo banco.</p>
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
