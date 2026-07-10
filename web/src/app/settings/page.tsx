'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, User, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = theme === 'dark';

  return (
    <div className="p-5 md:p-7 max-w-[700px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Settings</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Preferences &amp; account</p>
      </div>

      <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: 'var(--faint)' }}>
              {mounted && dark ? <Moon size={17} style={{ color: 'var(--sub)' }} /> : <Sun size={17} style={{ color: 'var(--sub)' }} />}
            </div>
            <div>
              <div className="text-[13px] font-medium">Appearance</div>
              <div className="text-[11.5px]" style={{ color: 'var(--sub)' }}>Light or dark theme</div>
            </div>
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--faint)' }}>
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)}
                className="text-[12px] px-3 h-7 rounded-md font-medium capitalize"
                style={{ background: (mounted && theme === t) ? 'var(--card)' : 'transparent', color: (mounted && theme === t) ? 'var(--accent)' : 'var(--sub)' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {[
          { icon: User, title: 'Profile', sub: 'Name, role, and contact details' },
          { icon: Bell, title: 'Notifications', sub: 'Email and in-app alerts' },
          { icon: Shield, title: 'Security', sub: 'Password and sessions' },
        ].map((row) => (
          <div key={row.title} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: 'var(--faint)' }}>
              <row.icon size={17} style={{ color: 'var(--sub)' }} />
            </div>
            <div>
              <div className="text-[13px] font-medium">{row.title}</div>
              <div className="text-[11.5px]" style={{ color: 'var(--sub)' }}>{row.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
