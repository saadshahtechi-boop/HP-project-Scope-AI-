'use client';

import {
  Stethoscope, ClipboardList, Activity, Pill, FlaskConical, Syringe,
} from 'lucide-react';
import { usePatientTimeline, type TimelineEvent } from '../api/use-patients';
import { fmtDate, fmtTime } from '../../../lib/utils';

const EVENT_STYLE: Record<TimelineEvent['type'], { icon: typeof Activity; tint: string }> = {
  ENCOUNTER: { icon: Stethoscope, tint: '#2563eb' },
  DIAGNOSIS: { icon: ClipboardList, tint: '#7c3aed' },
  OBSERVATION: { icon: Activity, tint: '#64748b' },
  PRESCRIPTION: { icon: Pill, tint: '#059669' },
  LAB_ORDER: { icon: FlaskConical, tint: '#d97706' },
  PROCEDURE: { icon: Syringe, tint: '#e11d48' },
};

function Dot({ color }: { color: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />;
}

/** The clinical timeline, wired to the getTimeline endpoint. */
export function PatientTimeline({ patientId }: { patientId: string }) {
  const { data, isLoading, isError } = usePatientTimeline(patientId);

  if (isLoading) return <div className="py-10 text-center text-[13px]" style={{ color: 'var(--sub)' }}>Loading timeline…</div>;
  if (isError) return <div className="py-10 text-center text-[13px]" style={{ color: '#dc2626' }}>Failed to load timeline.</div>;
  if (!data || data.length === 0) return <div className="py-10 text-center text-[13px]" style={{ color: 'var(--sub)' }}>No clinical events recorded yet.</div>;

  return (
    <div>
      {data.map((ev, i) => {
        const style = EVENT_STYLE[ev.type];
        const Icon = style.icon;
        const abnormal = (ev.meta as { abnormal?: boolean } | undefined)?.abnormal;
        const last = i === data.length - 1;
        return (
          <div key={i} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full grid place-items-center shrink-0 border-2"
                style={{ borderColor: style.tint, background: 'var(--card)' }}>
                <Icon size={14} style={{ color: style.tint }} />
              </div>
              {!last && <div className="w-px flex-1 my-1" style={{ background: 'var(--border)' }} />}
            </div>
            <div className="pb-5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: style.tint }}>{ev.type.replace('_', ' ')}</span>
                <span className="text-[11px] tabular-nums" style={{ color: '#94a3b8' }}>{fmtDate(ev.date)} · {fmtTime(ev.date)}</span>
              </div>
              <div className="text-[13.5px] font-medium mt-1 flex items-center gap-2">
                {abnormal !== undefined && ev.type === 'OBSERVATION' ? (
                  <span className="font-mono tabular-nums flex items-center gap-1.5">
                    {abnormal && <Dot color="#ef4444" />}
                    <span style={{ color: abnormal ? '#dc2626' : 'var(--text)' }}>{ev.title}</span>
                  </span>
                ) : ev.title}
              </div>
              {ev.detail && (
                <div className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--sub)' }}>
                  {ev.type === 'LAB_ORDER' && abnormal && <Dot color="#ef4444" />}{ev.detail}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
