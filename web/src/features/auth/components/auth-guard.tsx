'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

/**
 * Wraps protected content. While the session resolves, shows a minimal loader.
 * If resolution finishes with no user, redirects to /login. The /login route
 * itself is rendered outside this guard.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: 'var(--bg)' }}>
        <div className="text-[13px]" style={{ color: 'var(--sub)' }}>Loading…</div>
      </div>
    );
  }

  if (!user) return null; // redirect in-flight

  return <>{children}</>;
}
