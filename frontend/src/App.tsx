import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Toaster } from '@/components/ui/Toaster';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Dashboard } from '@/pages/Dashboard';
import { History } from '@/pages/History';
import { Login } from '@/pages/Login';
import { NewProject } from '@/pages/NewProject';
import { Prices } from '@/pages/Prices';
import { ProducerDetail } from '@/pages/ProducerDetail';
import { Producers } from '@/pages/Producers';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { SignPublic } from '@/pages/SignPublic';
import { VerifyPublic } from '@/pages/VerifyPublic';
import { ProtectedRoute, RequireRole } from '@/routes/ProtectedRoute';

export function App() {
  useAuthGuard();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rotas públicas — sem login, protegidas por token ou apenas informativas. */}
        <Route path="/sign/:projectId" element={<SignPublic />} />
        <Route path="/verify/:hash" element={<VerifyPublic />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/projects/new"
            element={
              <RequireRole roles={['ADMIN', 'AGRONOMIST']}>
                <NewProject />
              </RequireRole>
            }
          />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route
            path="/prices"
            element={
              <RequireRole roles={['ADMIN', 'AGRONOMIST']}>
                <Prices />
              </RequireRole>
            }
          />
          <Route path="/producers" element={<Producers />} />
          <Route path="/producers/:id" element={<ProducerDetail />} />
          <Route path="/history" element={<History />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
