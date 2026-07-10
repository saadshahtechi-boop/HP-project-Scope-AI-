'use client';

import { Pill, Check } from 'lucide-react';
import { usePharmacyQueue, useDispense } from '../api/use-pharmacy';
import { initials } from '../../../lib/utils';

export function PharmacyQueue() {
  const { data, isLoading, isError } = usePharmacyQueue();
  const dispense = useDispense();

  return (
    <div className="p-5 md:p-7 max-w-[1000px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Pharmacy</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Prescription dispensing queue</p>
      </div>

      {isLoading && <div className="p-8 text-center text-[13px]" style={{ color: 'var(--sub)' }}>Loading queue…</div>}
      {isError && <div className="p-8 text-center text-[13px]" style={{ color: '#dc2626' }}>Failed to load. Is the API running?</div>}
      {data && data.data.length === 0 && (
        <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <Pill size={26} className="mx-auto mb-2" style={{ color: '#cbd5e1' }} />
          <p className="text-[13px]" style={{ color: 'var(--sub)' }}>No prescriptions waiting to dispense.</p>
        </div>
      )}
      {data && data.data.length > 0 && (
        <div className="space-y-2.5">
          {data.data.map((rx) => (
            <div key={rx.id} className="rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <div className="w-9 h-9 rounded-full grid place-items-center text-[11px] font-semibold shrink-0" style={{ background: 'var(--hover)', color: 'var(--accent)' }}>
                {initials(rx.patient.firstName, rx.patient.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium flex items-center gap-2">
                  <Pill size={14} style={{ color: '#059669' }} /> {rx.medicationDisplay}
                </div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--sub)' }}>
                  {rx.patient.firstName} {rx.patient.lastName} · {rx.patient.mrn} · {rx.dosage} {rx.frequency}
                </div>
              </div>
              <div className="text-[12px] tabular-nums" style={{ color: 'var(--sub)' }}>
                Qty {rx.outstandingQty}
              </div>
              <button onClick={() => dispense.mutate(rx.id)} disabled={dispense.isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-white disabled:opacity-60" style={{ background: '#059669' }}>
                <Check size={14} /> Dispense
              </button>
            </div>
          ))}
        </div>
      )}
      {dispense.isError && <div className="mt-3 text-[12px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>Dispense failed — insufficient stock or invalid batch.</div>}
    </div>
  );
}
