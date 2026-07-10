'use client';

import { FlaskConical, Clock, Beaker, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLabWorklist, useLabSummary, useAdvanceLab } from '../api/use-laboratory';

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: '#2563eb', COLLECTED: '#d97706', PROCESSING: '#7c3aed',
  COMPLETED: '#059669', CANCELLED: '#94a3b8',
};
const NEXT_ACTION: Record<string, { label: string; to: string }> = {
  REQUESTED: { label: 'Collect', to: 'COLLECTED' },
  COLLECTED: { label: 'Process', to: 'PROCESSING' },
};

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof FlaskConical; label: string; value: number; tint: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: `${tint}1a` }}><Icon size={18} style={{ color: tint }} /></div>
      <div className="text-[24px] font-semibold tracking-tight mt-3 tabular-nums">{value}</div>
      <div className="text-[12px] mt-0.5" style={{ color: 'var(--sub)' }}>{label}</div>
    </div>
  );
}

export function LaboratoryWorklist() {
  const { data: orders, isLoading, isError } = useLabWorklist();
  const { data: summary } = useLabSummary();
  const advance = useAdvanceLab();

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Laboratory</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Order pipeline · auto-refreshing</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FlaskConical} label="Requested" value={summary?.REQUESTED ?? 0} tint="#2563eb" />
        <StatCard icon={Clock} label="Collected" value={summary?.COLLECTED ?? 0} tint="#d97706" />
        <StatCard icon={Beaker} label="Processing" value={summary?.PROCESSING ?? 0} tint="#7c3aed" />
        <StatCard icon={CheckCircle2} label="Completed" value={summary?.COMPLETED ?? 0} tint="#059669" />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        {isLoading && <div className="p-8 text-center text-[13px]" style={{ color: 'var(--sub)' }}>Loading orders…</div>}
        {isError && <div className="p-8 text-center text-[13px]" style={{ color: '#dc2626' }}>Failed to load. Is the API running?</div>}
        {orders && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--sub)', background: 'var(--faint)' }}>
                <th className="font-medium px-4 py-2.5">Test</th>
                <th className="font-medium px-4 py-2.5">Patient</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => {
                const action = NEXT_ACTION[o.status];
                return (
                  <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium">{o.display}</div>
                      <div className="text-[11px] font-mono" style={{ color: 'var(--sub)' }}>{o.code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px]">{o.patient.firstName} {o.patient.lastName}</div>
                      <div className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--sub)' }}>{o.patient.mrn}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${STATUS_STYLE[o.status]}1a`, color: STATUS_STYLE[o.status] }}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {action && (
                        <button onClick={() => advance.mutate({ id: o.id, status: action.to })}
                          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md" style={{ background: 'var(--hover)', color: 'var(--accent)' }}>
                          {action.label} <ArrowRight size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
