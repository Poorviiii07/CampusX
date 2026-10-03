import { lazy, Suspense, ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/types';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const PlaceholderPage = lazy(() => import('@/pages/PlaceholderPage'));

function Loading() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

function SuspenseWrap({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function PublicOnly() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RoleGuard({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}

function placeholder(label: string) {
  return <PlaceholderPage title={label} />;
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    element: <PublicOnly />,
    children: [
      {
        path: '/login',
        element: (
          <SuspenseWrap>
            <LoginPage />
          </SuspenseWrap>
        ),
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <SuspenseWrap>{placeholder('Dashboard')}</SuspenseWrap> },
      { path: '/campus-map', element: <SuspenseWrap>{placeholder('Campus Map')}</SuspenseWrap> },
      { path: '/find-classroom', element: <SuspenseWrap>{placeholder('Find Classroom')}</SuspenseWrap> },
      {
        element: <RoleGuard roles={['ADMIN', 'FACULTY', 'STUDENT']} />,
        children: [
          { path: '/timetable', element: <SuspenseWrap>{placeholder('My Timetable')}</SuspenseWrap> },
        ],
      },
      {
        element: <RoleGuard roles={['ADMIN', 'FACULTY', 'STUDENT']} />,
        children: [
          { path: '/ai-copilot', element: <SuspenseWrap>{placeholder('AI Copilot')}</SuspenseWrap> },
          { path: '/resources', element: <SuspenseWrap>{placeholder('Resources')}</SuspenseWrap> },
          { path: '/complaints', element: <SuspenseWrap>{placeholder('Complaints')}</SuspenseWrap> },
        ],
      },
      {
        path: '/admin',
        element: <RoleGuard roles={['ADMIN']} />,
        children: [
          { path: 'buildings', element: <SuspenseWrap>{placeholder('Buildings')}</SuspenseWrap> },
          { path: 'rooms', element: <SuspenseWrap>{placeholder('Rooms')}</SuspenseWrap> },
          { path: 'timetable', element: <SuspenseWrap>{placeholder('Timetable Admin')}</SuspenseWrap> },
          { path: 'complaints', element: <SuspenseWrap>{placeholder('Complaint Management')}</SuspenseWrap> },
          { path: 'analytics', element: <SuspenseWrap>{placeholder('Analytics')}</SuspenseWrap> },
          { path: 'optimization', element: <SuspenseWrap>{placeholder('Optimization')}</SuspenseWrap> },
          { path: 'simulation', element: <SuspenseWrap>{placeholder('Simulation')}</SuspenseWrap> },
          { path: 'energy', element: <SuspenseWrap>{placeholder('Energy')}</SuspenseWrap> },
          { path: 'reports', element: <SuspenseWrap>{placeholder('Reports')}</SuspenseWrap> },
          { path: 'ml', element: <SuspenseWrap>{placeholder('ML Models')}</SuspenseWrap> },
          { index: true, element: <Navigate to="/admin/analytics" replace /> },
        ],
      },
      {
        path: '/faculty',
        element: <RoleGuard roles={['FACULTY', 'ADMIN']} />,
        children: [
          { path: 'upload', element: <SuspenseWrap>{placeholder('Upload Resource')}</SuspenseWrap> },
          { path: 'reservations', element: <SuspenseWrap>{placeholder('My Reservations')}</SuspenseWrap> },
          { index: true, element: <Navigate to="/faculty/upload" replace /> },
        ],
      },
      {
        path: '/student',
        element: <RoleGuard roles={['STUDENT', 'ADMIN']} />,
        children: [
          { path: 'resources', element: <SuspenseWrap>{placeholder('My Resources')}</SuspenseWrap> },
          { index: true, element: <Navigate to="/student/resources" replace /> },
        ],
      },
    ],
  },
  {
    path: '/unauthorized',
    element: (
      <SuspenseWrap>
        <UnauthorizedPage />
      </SuspenseWrap>
    ),
  },
  {
    path: '*',
    element: (
      <SuspenseWrap>
        <NotFoundPage />
      </SuspenseWrap>
    ),
  },
];

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

export const router = createBrowserRouter(routes);

export default router;
