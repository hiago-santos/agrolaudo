import { FileStack, LayoutDashboard, ListChecks, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { Seal } from '@/components/ui/Seal';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects/new', label: 'Novo Projeto', icon: FileStack, hideForRoles: ['BANK'] as const },
  { to: '/prices', label: 'Preços & Custos', icon: ListChecks, hideForRoles: ['BANK'] as const },
  { to: '/producers', label: 'Produtores', icon: Users },
  { to: '/history', label: 'Histórico', icon: FileStack },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const role = useAuthStore((s) => s.user?.role);
  const items = NAV_ITEMS.filter((item) => !item.hideForRoles?.includes(role as 'BANK'));

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col border-r border-border bg-surface',
          'transition-transform duration-200 md:static md:z-auto md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <Seal size="sm" />
            <div>
              <p className="font-display text-sm font-semibold leading-none text-text">AgroLaudo</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-text-tertiary">
                Capacidade Pagadora
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-subtle md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border border-accent/20 bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-bg-subtle hover:text-text',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3 text-[10px] uppercase tracking-wider text-text-tertiary">
          Laudos de Capacidade Pagadora
        </div>
      </aside>
    </>
  );
}
