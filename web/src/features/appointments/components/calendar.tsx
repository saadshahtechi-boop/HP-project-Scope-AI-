'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A month-grid calendar for picking an appointment date. Past dates are
 * disabled. Emits the selected date as an ISO YYYY-MM-DD string.
 */
export function Calendar({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(value + 'T00:00:00') : null;
  const [view, setView] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const iso = (d: number) => {
    const m = String(month + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    return `${year}-${m}-${day}`;
  };
  const isPast = (d: number) => new Date(year, month, d) < today;
  const isSelected = (d: number) => selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <button onClick={() => setView(new Date(year, month - 1, 1))} className="w-7 h-7 grid place-items-center rounded-md" style={{ color: 'var(--sub)' }}><ChevronLeft size={16} /></button>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{monthLabel}</span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} className="w-7 h-7 grid place-items-center rounded-md" style={{ color: 'var(--sub)' }}><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium uppercase" style={{ color: 'var(--sub)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const past = isPast(d);
          const sel = isSelected(d);
          return (
            <button key={i} disabled={past} onClick={() => onChange(iso(d))}
              className="h-8 rounded-md text-[12.5px] tabular-nums grid place-items-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: sel ? 'var(--accent)' : 'transparent',
                color: sel ? '#fff' : 'var(--text)',
                fontWeight: isToday(d) && !sel ? 700 : 400,
                border: isToday(d) && !sel ? '1px solid var(--accent)' : '1px solid transparent',
              }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
