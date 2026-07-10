'use client';

import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications, useMarkAllRead, useMarkRead } from '../api/use-notifications';
import { fmtDate, fmtTime } from '../../../lib/utils';

/**
 * Topbar notification bell: live unread badge (polled) + a dropdown feed.
 * Reads scoped to the current user by the backend.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const markOne = useMarkRead();
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="w-9 h-9 grid place-items-center rounded-lg relative"
        style={{ color: 'var(--sub)' }} aria-label="Notifications">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 grid place-items-center rounded-full text-[9px] font-semibold text-white"
            style={{ background: '#ef4444' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-xl border shadow-lg z-20 overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[13px] font-semibold">Notifications</span>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!data || data.data.length === 0 ? (
                <div className="p-8 text-center text-[12px]" style={{ color: 'var(--sub)' }}>No notifications.</div>
              ) : (
                data.data.map((n) => (
                  <button key={n.id} onClick={() => markOne.mutate(n.id)}
                    className="w-full text-left px-4 py-3 border-b transition-colors hover:[background:var(--hover)]"
                    style={{ borderColor: 'var(--border)', background: n.status === 'UNREAD' ? 'var(--faint)' : 'transparent' }}>
                    <div className="flex items-start gap-2">
                      {n.status === 'UNREAD' && <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--accent)' }} />}
                      <div className={n.status === 'READ' ? 'ml-3.5' : ''}>
                        <div className="text-[12.5px] font-medium">{n.title}</div>
                        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--sub)' }}>{n.body}</div>
                        <div className="text-[10px] mt-1 tabular-nums" style={{ color: '#94a3b8' }}>{fmtDate(n.createdAt)} · {fmtTime(n.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
