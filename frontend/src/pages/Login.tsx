import { zodResolver } from '@hookform/resolvers/zod';
import { Sprout } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { FieldError, Input, Label } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/auth';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  senha: z.string().min(1, 'Informe a senha.'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // Só confia no user do localStorage depois do /auth/me — senão a UI parece
  // logada com cookie morto e todas as APIs respondem 401.
  if (!hydrated) return <PageSpinner />;
  if (isAuth) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={destino} replace />;
  }

  async function onSubmit(data: LoginForm) {
    const ok = await login(data.email, data.senha);
    if (ok) navigate('/', { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-sm">
            <Sprout className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-text">AgroLaudo</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Laudos de Capacidade Pagadora para produtores rurais
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
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
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" autoComplete="current-password" {...register('senha')} />
            <FieldError>{errors.senha?.message}</FieldError>
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Acesso restrito a Engenheiros Agrônomos e instituições parceiras.
        </p>
      </div>
    </div>
  );
}
