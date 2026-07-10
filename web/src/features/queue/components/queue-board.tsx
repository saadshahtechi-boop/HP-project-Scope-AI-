'use client';

import { Users, Stethoscope, AlertTriangle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useQueueBoard, type QueueTicket } from '../api/use-queue';
import { initials } from '../../../lib/utils';

const LANE_META = {
  emergency: { label: 'Emergency', color: '#dc2626', icon: AlertTriangle },
  priority: { label: 'Priority', color: '#d97706', icon: Clock },
  normal: { label: 'Waiting', color: '#2563eb', icon: Users },
} as const;

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Users; label: string; value: number; tint: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: `${tint}1a` }}>
        <Icon size={18} style={{ color: tint }} />
      </div>
      <div className="text-[24px] font-semibold tracking-tight mt-3 tabular-nums">{value}</div>
      <div className="text-[12px] mt-0.5" style={{ color: 'var(--sub)' }}>{label}</div>
    </div>
  );
}

function TicketCard({ ticket, color }: { ticket: QueueTicket; color: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[15px] font-semibold tabular-nums px-2 py-0.5 rounded-md" style={{ background: `${color}1a`, color }}>#{ticket.tokenNumber}</div>
        {ticket.estimatedWaitMins != null && (
          <span className="text-[11px] tabular-nums flex items-center gap-1" style={{ color: 'var(--sub)' }}>
            <Clock size={11} /> ~{ticket.estimatedWaitMins}m
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-semibold shrink-0"
          style={{ background: 'var(--hover)', color: 'var(--accent)' }}>{initials(ticket.patient.firstName, ticket.patient.lastName)}</div>
        <div className="leading-tight min-w-0">
          <div className="text-[13px] font-medium truncate">{ticket.patient.firstName} {ticket.patient.lastName}</div>
          <div className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--sub)' }}>{ticket.patient.mrn}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-[11px]" style={{ color: 'var(--sub)' }}>Dr. {ticket.practitioner?.lastName ?? '—'}</span>
        <button className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md" style={{ background: 'var(--hover)', color: 'var(--accent)' }}>
          Call <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

export function QueueBoard() {
  const { data: board, isLoading, isError } = useQueueBoard();

  if (isLoading) return <div className="p-7 text-[13px]" style={{ color: 'var(--sub)' }}>Loading queue…</div>;
  if (isError || !board) return <div className="p-7 text-[13px]" style={{ color: '#dc2626' }}>Failed to load queue. Is the API running?</div>;

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Live queue</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Auto-refreshing every 10 seconds</p>
        </div>
        <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg text-[12px] font-medium" style={{ background: '#f0fdf4', color: '#059669' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#059669' }} /> Live
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Waiting" value={board.summary.waiting} tint="#2563eb" />
        <StatCard icon={Stethoscope} label="In consultation" value={board.summary.inConsultation} tint="#7c3aed" />
        <StatCard icon={AlertTriangle} label="Emergency" value={board.summary.emergency} tint="#dc2626" />
        <StatCard icon={CheckCircle2} label="Completed today" value={board.summary.completed} tint="#059669" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {(['emergency', 'priority', 'normal'] as const).map((laneKey) => {
          const meta = LANE_META[laneKey];
          const tickets = board.lanes[laneKey];
          return (
            <div key={laneKey}>
              <div className="flex items-center gap-2 mb-3">
                <meta.icon size={15} style={{ color: meta.color }} />
                <h2 className="text-[14px] font-semibold">{meta.label}</h2>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums" style={{ background: `${meta.color}1a`, color: meta.color }}>{tickets.length}</span>
              </div>
              <div className="space-y-2.5">
                {tickets.length ? tickets.map((t) => <TicketCard key={t.id} ticket={t} color={meta.color} />)
                  : <div className="rounded-lg border border-dashed p-6 text-center text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--sub)' }}>No patients in this lane</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
