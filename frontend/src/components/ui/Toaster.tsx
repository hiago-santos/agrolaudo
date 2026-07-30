import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useToastStore, type ToastVariant } from '@/stores/toast';

const ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const ESTILO: Record<ToastVariant, string> = {
  success: 'border-success/35 bg-success-soft text-[var(--text)]',
  error: 'border-danger/35 bg-danger-soft text-[var(--text)]',
  info: 'border-border-strong bg-surface text-[var(--text)]',
};

const ICONE_COR: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-sm',
              'animate-in fade-in slide-in-from-bottom-2',
              ESTILO[t.variant],
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICONE_COR[t.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-[var(--text-tertiary)] hover:bg-black/5"
              aria-label="Fechar notificação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
