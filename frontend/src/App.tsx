import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Toaster } from '@/components/ui/Toaster';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AssinarPublico } from '@/pages/AssinarPublico';
import { Dashboard } from '@/pages/Dashboard';
import { Historico } from '@/pages/Historico';
import { LaudoDetalhe } from '@/pages/LaudoDetalhe';
import { Login } from '@/pages/Login';
import { NovoLaudo } from '@/pages/NovoLaudo';
import { Precos } from '@/pages/Precos';
import { ProdutorDetalhe } from '@/pages/ProdutorDetalhe';
import { Produtores } from '@/pages/Produtores';
import { VerificarPublico } from '@/pages/VerificarPublico';
import { ProtectedRoute, RequireRole } from '@/routes/ProtectedRoute';

export function App() {
  useAuthGuard();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rotas públicas — sem login, protegidas por token ou apenas informativas. */}
        <Route path="/assinar/:laudoId" element={<AssinarPublico />} />
        <Route path="/verificar/:hash" element={<VerificarPublico />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/laudos/novo"
            element={
              <RequireRole roles={['ADMIN', 'AGRONOMO']}>
                <NovoLaudo />
              </RequireRole>
            }
          />
          <Route path="/laudos/:id" element={<LaudoDetalhe />} />
          <Route
            path="/precos"
            element={
              <RequireRole roles={['ADMIN', 'AGRONOMO']}>
                <Precos />
              </RequireRole>
            }
          />
          <Route path="/produtores" element={<Produtores />} />
          <Route path="/produtores/:id" element={<ProdutorDetalhe />} />
          <Route path="/historico" element={<Historico />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
