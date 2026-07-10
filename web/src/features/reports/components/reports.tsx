'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useDoctorPerformance, usePatientGrowth } from '../api/use-reports';

export function Reports() {
  const { data: perf } = useDoctorPerformance();
  const { data: growth } = usePatientGrowth();
  const tip = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 };
  const maxConsults = perf && perf.length ? Math.max(...perf.map((d) => d.consultations)) : 1;

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Reports</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Performance &amp; growth analytics</p>
      </div>

      <div className="rounded-xl border mb-5" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-[13px] font-semibold">Patient growth</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--sub)' }}>Cumulative, last 30 days</p>
        </div>
        <div className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growth ?? []} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--sub)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="var(--sub)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tip} />
              <Area type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} fill="url(#grow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="px-4 h-11 flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-[13px] font-semibold">Doctor performance</h3>
        </div>
        <div className="p-4 space-y-3">
          {(perf ?? []).slice(0, 10).map((d, i) => (
            <div key={d.practitionerId} className="flex items-center gap-3">
              <div className="text-[11px] font-semibold w-5 tabular-nums" style={{ color: 'var(--sub)' }}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium truncate">{d.name}</span>
                  <span className="text-[12px] tabular-nums font-semibold">{d.consultations}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--faint)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(d.consultations / maxConsults) * 100}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            </div>
          ))}
          {(!perf || perf.length === 0) && <div className="text-[13px] text-center py-4" style={{ color: 'var(--sub)' }}>No consultation data yet.</div>}
        </div>
      </div>
    </div>
  );
}
