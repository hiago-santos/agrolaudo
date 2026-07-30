import { FileStack, LayoutDashboard, ListChecks, Sprout, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/laudos/novo', label: 'Novo Laudo', icon: FileStack, rolesOcultar: ['BANCO'] as const },
  { to: '/precos', label: 'Preços & Custos', icon: ListChecks, rolesOcultar: ['BANCO'] as const },
  { to: '/produtores', label: 'Produtores', icon: Users },
  { to: '/historico', label: 'Histórico', icon: FileStack },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const role = useAuthStore((s) => s.user?.role);
  const itens = NAV_ITEMS.filter((item) => !item.rolesOcultar?.includes(role as 'BANCO'));

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[236px] shrink-0 flex-col border-r border-border',
          'bg-surface/95 backdrop-blur-md transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:bg-surface/70',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <Sprout className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-text">AgroLaudo</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-text-tertiary">
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

        <nav className="flex-1 space-y-1 px-3 py-2">
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-text-secondary hover:bg-bg-subtle hover:text-text',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3 text-[10px] text-text-tertiary">
          AgroLaudo · Laudos de Capacidade Pagadora
        </div>
      </aside>
    </>
  );
}
