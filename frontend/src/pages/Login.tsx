import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { FieldError, Input, Label } from '@/components/ui/Input';
import { BootScreen } from '@/components/ui/BootScreen';
import { Seal } from '@/components/ui/Seal';
import { useAuthStore } from '@/stores/auth';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
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

  if (!hydrated) return <BootScreen />;
  if (isAuth) {
    const destination = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={destination} replace />;
  }

  async function onSubmit(data: LoginForm) {
    const ok = await login(data.email, data.password);
    if (ok) navigate('/', { replace: true });
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
          <Seal size="lg" />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-text">AgroLaudo</h1>
          <p className="mt-2 max-w-xs text-sm text-text-secondary">
            Laudos de Capacidade Pagadora para produtores rurais
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4 rounded-lg border border-border-strong bg-surface p-6"
        >
          <div className="border-b border-border pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
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
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            <FieldError>{errors.password?.message}</FieldError>
          </div>

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
