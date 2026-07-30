import { LogOut, Menu, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  AGRONOMO: 'Engenheiro Agrônomo',
  BANCO: 'Analista de Crédito',
};

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-text-secondary hover:bg-bg-subtle md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg-subtle"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-medium leading-none text-text">{user?.nome}</span>
            <span className="mt-0.5 block text-[10px] leading-none text-text-tertiary">
              {user ? (ROLE_LABEL[user.role] ?? user.role) : ''}
            </span>
          </span>
        </button>

        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-48 origin-top-right rounded-lg border border-border bg-surface p-1 shadow-lg',
            'transition-all duration-150',
            menuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0',
          )}
        >
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-text-secondary hover:bg-bg-subtle hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
