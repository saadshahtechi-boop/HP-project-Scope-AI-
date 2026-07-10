'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '../../features/auth/components/auth-guard';
import { AppShell } from './app-shell';

/**
 * Decides the chrome for a route: /login renders bare (no sidebar/topbar and no
 * guard, so unauthenticated users can reach it); every other route is wrapped in
 * the AuthGuard and the full AppShell.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
