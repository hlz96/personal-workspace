import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { OnboardingModal } from '@/components/shared/OnboardingModal';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { SessionSync } from '@/components/shared/SessionSync';
import { AuthProvider } from '@/lib/auth';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const Projects = lazy(() => import('@/pages/Projects'));
const Achievements = lazy(() => import('@/pages/Achievements'));
const Reports = lazy(() => import('@/pages/Reports'));
const Reviews = lazy(() => import('@/pages/Reviews'));
const Stats = lazy(() => import('@/pages/Stats'));
const Settings = lazy(() => import('@/pages/Settings'));
const Login = lazy(() => import('@/pages/Login'));

const Fallback = () => (
  <div className="p-6 text-sm text-[rgb(var(--muted))]">加载中...</div>
);

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<Fallback />}>
        <Login />
      </Suspense>
    ),
  },
  {
    element: (
      <AuthGuard>
        <SessionSync>
          <>
            <AppShell />
            <OnboardingModal />
          </>
        </SessionSync>
      </AuthGuard>
    ),
    children: [
      { path: '/', element: <Suspense fallback={<Fallback />}><Dashboard /></Suspense> },
      { path: '/tasks', element: <Suspense fallback={<Fallback />}><Tasks /></Suspense> },
      { path: '/projects', element: <Suspense fallback={<Fallback />}><Projects /></Suspense> },
      { path: '/achievements', element: <Suspense fallback={<Fallback />}><Achievements /></Suspense> },
      { path: '/reports', element: <Suspense fallback={<Fallback />}><Reports /></Suspense> },
      { path: '/reviews', element: <Suspense fallback={<Fallback />}><Reviews /></Suspense> },
      { path: '/stats', element: <Suspense fallback={<Fallback />}><Stats /></Suspense> },
      { path: '/settings', element: <Suspense fallback={<Fallback />}><Settings /></Suspense> },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
