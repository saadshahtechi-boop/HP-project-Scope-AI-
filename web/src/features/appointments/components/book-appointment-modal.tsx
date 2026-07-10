'use client';

import { useState } from 'react';
import { X, Search, Loader2, CalendarDays } from 'lucide-react';
import { Calendar } from './calendar';
import {
  useCreateAppointment, usePatientOptions, usePractitioners,
} from '../api/use-appointments';

/**
 * Booking form. Everything here maps to the real POST /appointments contract:
 * patientId, practitionerId, scheduledStart/End (ISO), optional reason. The 409
 * the backend throws on an overlapping slot is surfaced inline rather than
 * swallowed, so double-booking is visibly prevented.
 */
export function BookAppointmentModal({ onClose }: { onClose: () => void }) {
  const create = useCreateAppointment();
  const { data: doctors } = usePractitioners();

  const [patientSearch, setPatientSearch] = useState('');
  const [patient, setPatient] = useState<{ id: string; label: string } | null>(null);
  const { data: patientResults } = usePatientOptions(patientSearch);

  const [practitionerId, setPractitionerId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMin, setDurationMin] = useState(30);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    setFormError(null);
    if (!patient) return setFormError('Select a patient.');
    if (!practitionerId) return setFormError('Select a doctor.');
    if (!date || !startTime) return setFormError('Pick a date and start time.');

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + durationMin * 60_000);

    create.mutate(
      {
        patientId: patient.id,
        practitionerId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        reason: reason || undefined,
      },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          setFormError(
            status === 409
              ? 'That slot overlaps another appointment for this doctor. Pick a different time.'
              : 'Could not book the appointment. Please try again.',
          );
        },
      },
    );
  };

  const field = { borderColor: 'var(--border)', background: 'var(--faint)', color: 'var(--text)' };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-xl border shadow-xl" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center justify-between px-5 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Book appointment</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg" style={{ color: 'var(--sub)' }}><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Patient search */}
          <div>
            <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Patient</label>
            {patient ? (
              <div className="mt-1 flex items-center justify-between rounded-lg border px-3 h-10" style={field}>
                <span className="text-[13px]" style={{ color: 'var(--text)' }}>{patient.label}</span>
                <button onClick={() => setPatient(null)} className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>Change</button>
              </div>
            ) : (
              <div className="mt-1 relative">
                <div className="flex items-center gap-2 rounded-lg border px-3 h-10" style={field}>
                  <Search size={14} style={{ color: '#94a3b8' }} />
                  <input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search name or MRN (2+ chars)"
                    className="bg-transparent outline-none text-[13px] flex-1" style={{ color: 'var(--text)' }} />
                </div>
                {patientResults && patientResults.data.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border shadow-lg overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                    {patientResults.data.map((p) => (
                      <button key={p.id} onClick={() => { setPatient({ id: p.id, label: `${p.firstName} ${p.lastName} · ${p.mrn}` }); setPatientSearch(''); }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:[background:var(--hover)]" style={{ color: 'var(--text)' }}>
                        {p.firstName} {p.lastName} <span className="font-mono text-[11px]" style={{ color: 'var(--sub)' }}>{p.mrn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Doctor</label>
            <select value={practitionerId} onChange={(e) => setPractitionerId(e.target.value)}
              className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field}>
              <option value="">Select a doctor…</option>
              {(doctors ?? []).map((d) => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}{d.specialty ? ` · ${d.specialty}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Date — visual calendar */}
          <div>
            <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Date</label>
            <div className="mt-1"><Calendar value={date} onChange={setDate} /></div>
          </div>

          {/* Time slots + duration */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Start time</label>
              <div className="mt-1 grid grid-cols-4 gap-1.5">
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map((slot) => (
                  <button key={slot} onClick={() => setStartTime(slot)}
                    className="h-8 rounded-md text-[12px] tabular-nums border transition-colors"
                    style={{
                      background: startTime === slot ? 'var(--accent)' : 'var(--faint)',
                      color: startTime === slot ? '#fff' : 'var(--text)',
                      borderColor: startTime === slot ? 'var(--accent)' : 'var(--border)',
                    }}>{slot}</button>
                ))}
              </div>
            </div>
            <div className="col-span-1">
              <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Minutes</label>
              <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full mt-1 rounded-lg border px-2 h-10 text-[13px] outline-none" style={field}>
                {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Reason <span style={{ color: 'var(--sub)' }}>(optional)</span></label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Follow-up, hypertension review"
              className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} />
          </div>

          {formError && (
            <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{formError}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 h-16 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--sub)', background: 'var(--card)' }}>Cancel</button>
          <button onClick={submit} disabled={create.isPending}
            className="h-9 px-4 rounded-lg text-[13px] font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            {create.isPending ? 'Booking…' : 'Book appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}
