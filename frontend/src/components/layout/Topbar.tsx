import { ChevronDown, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  AGRONOMIST: 'Engenheiro Agrônomo',
  BANK: 'Analista de Crédito',
};

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <DropdownMenu
          label="Menu da conta"
          triggerClassName="px-2 py-1.5 hover:bg-bg-subtle"
          trigger={
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium leading-none text-text">{user?.name}</span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-wide leading-none text-text-tertiary">
                  {user ? (ROLE_LABEL[user.role] ?? user.role) : ''}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
            </>
          }
        >
          <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void handleLogout()}
            tone="danger"
            icon={<LogOut className="h-4 w-4" />}
          >
            Sair
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
