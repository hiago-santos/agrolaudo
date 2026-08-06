import { zodResolver } from '@hookform/resolvers/zod';
import { Bank, Plant } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { BootScreen } from '@/components/ui/BootScreen';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FieldError, Input, Label } from '@/components/ui/Input';
import { Seal } from '@/components/ui/Seal';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/types/domain';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
  rememberMe: z.boolean(),
});
type LoginForm = z.infer<typeof loginSchema>;

/**
 * Credenciais do seed (`backend/prisma/seed.ts`) — só pra pular o formulário durante
 * a fase de prévia/demonstração. TIRAR daqui antes de qualquer deploy que não seja
 * só pra mostrar o sistema pra alguém.
 */
interface QuickLoginEntry {
  role: UserRole;
  label: string;
  email: string;
  password: string;
  icon: typeof Plant;
}

const QUICK_LOGIN: QuickLoginEntry[] = [
  {
    role: 'AGRONOMIST',
    label: 'Engenheiro Agrônomo',
    email: 'pedro.agronomist@agrolaudo.local',
    password: 'agronomist123',
    icon: Plant,
  },
  {
    role: 'BANK',
    label: 'Banco',
    email: 'bank@agrolaudo.local',
    password: 'bank123',
    icon: Bank,
  },
];

export function Login() {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const hydrated = useAuthStore((s) => s.hydrated);
  const remembered = useAuthStore((s) => s.rememberMe);
  const isAuth = useAuthStore((s) => s.authenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/';
  const [quickLoginRole, setQuickLoginRole] = useState<UserRole | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: remembered },
  });

  if (!hydrated) return <BootScreen />;
  if (isAuth) {
    return <Navigate to={destination} replace />;
  }

  async function onSubmit(data: LoginForm) {
    const ok = await login(data.email, data.password, data.rememberMe);
    if (ok) navigate(destination, { replace: true });
  }

  async function quickLogin(entry: (typeof QUICK_LOGIN)[number]) {
    setQuickLoginRole(entry.role);
    try {
      const ok = await login(entry.email, entry.password, false);
      if (ok) navigate(destination, { replace: true });
    } finally {
      setQuickLoginRole(null);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(30, 77, 43, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(184, 134, 46, 0.06) 0%, transparent 50%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 39px,
              rgba(34, 31, 23, 0.03) 39px,
              rgba(34, 31, 23, 0.03) 40px
            )
          `,
        }}
      />

      <div className="relative w-full max-w-sm animate-page-enter">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Seal size="md" />
            <div className="text-left">
              <h1 className="font-display text-2xl font-semibold leading-none tracking-tight text-text sm:text-3xl">
                AgroLaudo
              </h1>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                Capacidade Pagadora
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-2 rounded-lg border border-gold/40 bg-gold-soft p-4">
          {quickLoginRole ? (
            <div className="flex min-h-[4.5rem] flex-col items-center justify-center gap-2 py-1">
              <Spinner className="h-5 w-5 text-gold" />
              <p className="text-xs text-text-secondary">
                Entrando como {QUICK_LOGIN.find((e) => e.role === quickLoginRole)?.label}…
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">
                Prévia — entrar sem senha
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_LOGIN.map((entry) => (
                  <Button
                    key={entry.role}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto flex-col gap-1 py-2.5 text-[11px]"
                    disabled={loading}
                    onClick={() => void quickLogin(entry)}
                  >
                    <entry.icon className="h-4 w-4" />
                    {entry.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4 rounded-lg border border-border-strong bg-surface p-6"
        >
          <div className="border-b border-border pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              Acesso restrito
            </p>
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="voce@agrolaudo.local"
              {...register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-secondary">
            <Checkbox {...register('rememberMe')} />
            <span>Lembrar-me neste dispositivo</span>
          </label>

          {error && (
            <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Engenheiros Agrônomos e instituições parceiras
        </p>
      </div>
    </div>
  );
}
