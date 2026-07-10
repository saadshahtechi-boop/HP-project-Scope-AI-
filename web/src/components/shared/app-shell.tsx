'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Users, Calendar, ListOrdered, Stethoscope, FlaskConical,
  Pill, Package, Receipt, BarChart3, Search, Sun, Moon, Heart, Sparkles, Settings, LogOut,
} from 'lucide-react';
import { NotificationBell } from '../../features/notifications/components/notification-bell';
import { useAuth } from '../../features/auth/components/auth-provider';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Patients', href: '/patients' },
  { icon: Calendar, label: 'Appointments', href: '/appointments' },
  { icon: ListOrdered, label: 'Queue', href: '/queue' },
  { icon: Stethoscope, label: 'Consultation', href: '/consultation' },
  { icon: FlaskConical, label: 'Laboratory', href: '/laboratory' },
  { icon: Pill, label: 'Pharmacy', href: '/pharmacy' },
  { icon: Package, label: 'Inventory', href: '/inventory' },
  { icon: Receipt, label: 'Billing', href: '/billing' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: Sparkles, label: 'AI Assistant', href: '/ai-assistant' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r hidden md:flex flex-col"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="h-16 flex items-center gap-2.5 px-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Heart size={17} className="text-white" fill="white" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">Techciko</div>
          <div className="text-[10px] font-medium" style={{ color: 'var(--sub)' }}>Health Suite</div>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}
              className="w-full flex items-center gap-3 px-2.5 h-9 rounded-lg text-[13px] font-medium transition-colors"
              style={{ background: active ? 'var(--hover)' : 'transparent', color: active ? 'var(--accent)' : 'var(--sub)' }}>
              <n.icon size={17} className="shrink-0" />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // avoid hydration mismatch on theme icon
  const dark = theme === 'dark';

  return (
    <header className="h-16 border-b flex items-center gap-4 px-5 shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="flex items-center gap-2 flex-1 max-w-md px-3 h-9 rounded-lg border"
        style={{ borderColor: 'var(--border)', background: 'var(--faint)' }}>
        <Search size={15} style={{ color: '#94a3b8' }} />
        <input placeholder="Search patients, MRN, phone…"
          className="bg-transparent outline-none text-[13px] flex-1" style={{ color: 'var(--text)' }} />
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={() => setTheme(dark ? 'light' : 'dark')}
          className="w-9 h-9 grid place-items-center rounded-lg" style={{ color: 'var(--sub)' }} aria-label="Toggle theme">
          {mounted && dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <NotificationBell />
        <div className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold text-white ml-1"
          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
          {user ? user.email.slice(0, 2).toUpperCase() : 'DB'}
        </div>
        <button onClick={() => logout()} className="w-9 h-9 grid place-items-center rounded-lg" style={{ color: 'var(--sub)' }} aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
