'use client';

import {
  Users, DollarSign, Clock, CheckCircle2, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  useDashboardSummary, useRevenueSeries, useAppointmentSeries, useDiseaseStats,
} from '../api/use-dashboard';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#d97706', '#94a3b8'];

function StatCard({ icon: Icon, label, value, tint, delta }: {
  icon: typeof Users; label: string; value: string | number; tint: string; delta?: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: `${tint}1a` }}>
          <Icon size={18} style={{ color: tint }} />
        </div>
        {delta && (
          <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#059669' }}>
            <TrendingUp size={13} />{delta}
          </div>
        )}
      </div>
      <div className="text-[24px] font-semibold tracking-tight mt-3 tabular-nums">{value}</div>
      <div className="text-[12px] mt-0.5" style={{ color: 'var(--sub)' }}>{label}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: 'var(--sub)' }}>{subtitle}</p>}
      </div>
      <div className="px-2 pb-3">{children}</div>
    </div>
  );
}

export function Dashboard() {
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: revenue } = useRevenueSeries();
  const { data: appts } = useAppointmentSeries();
  const { data: diseases } = useDiseaseStats();

  const tip = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 };

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Live clinic overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Users} label="Today's patients" value={isLoading ? '—' : summary?.todaysPatients ?? 0} tint="#2563eb" />
        <StatCard icon={DollarSign} label="Today's revenue" value={isLoading ? '—' : `$${(summary?.todaysRevenue ?? 0).toLocaleString()}`} tint="#059669" />
        <StatCard icon={Clock} label="Waiting patients" value={isLoading ? '—' : summary?.waitingPatients ?? 0} tint="#d97706" />
        <StatCard icon={CheckCircle2} label="Completed consults" value={isLoading ? '—' : summary?.completedConsultations ?? 0} tint="#7c3aed" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue" subtitle="Last 7 days">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue ?? []} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--sub)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="var(--sub)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Disease statistics" subtitle="Top diagnoses">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={diseases ?? []} dataKey="count" nameKey="display" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2}>
                {(diseases ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={tip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="px-3 pb-1 space-y-1.5">
            {(diseases ?? []).slice(0, 4).map((d, i) => (
              <div key={d.code} className="flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span style={{ color: 'var(--sub)' }}>{d.display}</span>
                </div>
                <span className="tabular-nums font-medium">{d.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Appointments" subtitle="Booked vs completed, last 7 days">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={appts ?? []} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--sub)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
            <YAxis stroke="var(--sub)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tip} />
            <Bar dataKey="booked" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="completed" fill="#2563eb" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
