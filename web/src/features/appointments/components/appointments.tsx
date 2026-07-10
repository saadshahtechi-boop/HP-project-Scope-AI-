'use client';

import { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useAppointments, type AppointmentItem } from '../api/use-appointments';
import { BookAppointmentModal } from './book-appointment-modal';
import { fmtTime, initials } from '../../../lib/utils';

const STATUS_STYLE: Record<string, string> = {
  BOOKED: '#94a3b8', CONFIRMED: '#2563eb', CHECKED_IN: '#d97706',
  COMPLETED: '#059669', NO_SHOW: '#dc2626', CANCELLED: '#94a3b8',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function Appointments() {
  const { data, isLoading, isError } = useAppointments(todayISO());
  const [booking, setBooking] = useState(false);

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto w-full">
      {booking && <BookAppointmentModal onClose={() => setBooking(false)} />}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Appointments</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Today's schedule</p>
        </div>
        <button onClick={() => setBooking(true)} className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-medium text-white shadow-sm" style={{ background: 'var(--accent)' }}>
          <Plus size={16} /> Book appointment
        </button>
      </div>

      {isLoading && <div className="p-8 text-center text-[13px]" style={{ color: 'var(--sub)' }}>Loading schedule…</div>}
      {isError && <div className="p-8 text-center text-[13px]" style={{ color: '#dc2626' }}>Failed to load. Is the API running?</div>}
      {data && data.data.length === 0 && (
        <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <Calendar size={26} className="mx-auto mb-2" style={{ color: '#cbd5e1' }} />
          <p className="text-[13px]" style={{ color: 'var(--sub)' }}>No appointments scheduled for today.</p>
        </div>
      )}
      {data && data.data.length > 0 && (
        <div className="space-y-2.5">
          {data.data.map((a: AppointmentItem) => (
            <div key={a.id} className="rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <div className="text-center shrink-0 w-16">
                <div className="text-[13px] font-semibold tabular-nums">{fmtTime(a.scheduledStart)}</div>
                <div className="text-[10px]" style={{ color: 'var(--sub)' }}>{fmtTime(a.scheduledEnd)}</div>
              </div>
              <div className="w-9 h-9 rounded-full grid place-items-center text-[11px] font-semibold shrink-0" style={{ background: 'var(--hover)', color: 'var(--accent)' }}>
                {initials(a.patient.firstName, a.patient.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{a.patient.firstName} {a.patient.lastName}</div>
                <div className="text-[11.5px]" style={{ color: 'var(--sub)' }}>Dr. {a.practitioner.lastName} · {a.reason ?? 'Consultation'}</div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0" style={{ background: `${STATUS_STYLE[a.status]}1a`, color: STATUS_STYLE[a.status] }}>
                {a.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
