import { useQueryClient } from '@tanstack/react-query';
import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { onAuthProblem } from './api/client';
import { keys, useSession } from './api/hooks';
import { AppShell } from './components/AppShell';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { FilePage } from './pages/FilePage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { CoursesPage } from './pages/CoursesPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';

// Secciones menos frecuentes: se cargan al visitarlas (reduce el paquete inicial).
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const GradesPage = lazy(() => import('./pages/GradesPage').then((m) => ({ default: m.GradesPage })));
const UpdatesPage = lazy(() => import('./pages/UpdatesPage').then((m) => ({ default: m.UpdatesPage })));

function Splash() {
  // Sin logo: un lienzo vacío para que el esqueleto y las animaciones de entrada del Inicio sean lo primero que se ve.
  return <div style={{ minHeight: '100dvh', background: 'var(--ground)' }} aria-busy="true" aria-label="Cargando Academic Hub" />;
}

/** Redirige ante 401 (sesión expirada) o contraseña temporal pendiente detectados por cualquier consulta. */
function AuthEvents({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  useEffect(() => onAuthProblem((error) => {
    if (error.code === 'password_change_required') {
      void client.invalidateQueries({ queryKey: keys.session });
      navigate('/change-password', { replace: true });
      return;
    }
    client.clear();
    client.setQueryData(keys.session, null);
    navigate('/login', { replace: true, state: { expired: true } });
  }), [client, navigate]);
  return children;
}

function RequireAuth({ allowPendingPassword = false }: { allowPendingPassword?: boolean }) {
  const { data, isPending } = useSession();
  if (isPending) return <Splash />;
  if (!data?.user) return <Navigate to="/login" replace />;
  if (data.user.mustChangePassword && !allowPendingPassword) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

function ShellLayout() {
  return <AppShell><Suspense fallback={<div aria-busy="true" style={{ minHeight: 320 }} />}><Outlet /></Suspense></AppShell>;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthEvents>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth allowPendingPassword />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/courses/:courseId/files/:contentId" element={<FilePage />} />
            <Route element={<ShellLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/grades" element={<GradesPage />} />
              <Route path="/updates" element={<UpdatesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthEvents>
    </BrowserRouter>
  );
}
