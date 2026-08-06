import { CheckCircle, Info, X, XCircle } from '@phosphor-icons/react';

import { cn } from '@/lib/cn';
import { useToastStore, type ToastVariant } from '@/stores/toast';

const ICON: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const ESTILO: Record<ToastVariant, string> = {
  success: 'border-success/40 bg-success-soft text-text',
  error: 'border-danger/40 bg-danger-soft text-text',
  info: 'border-border-strong bg-surface text-text',
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
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((t) => {
        const Icon = ICON[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border p-3',
              t.leaving ? 'animate-fade-out' : 'animate-page-enter',
              ESTILO[t.variant],
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICONE_COR[t.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-text-secondary">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-text-tertiary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
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
