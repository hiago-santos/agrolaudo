import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong bg-bg-subtle/40 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-text">{title}</p>
        {description && <p className="max-w-sm text-xs text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
