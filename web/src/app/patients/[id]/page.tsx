'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { ChevronLeft, ShieldAlert, Pencil } from 'lucide-react';
import { usePatient } from '../../../features/patients/api/use-patients';
import { PatientTimeline } from '../../../features/patients/components/patient-timeline';
import { PatientFormModal } from '../../../features/patients/components/patient-form-modal';
import { BLOOD_LABEL, ageFrom, initials, fmtDate } from '../../../lib/utils';

/**
 * Patient profile route. Next 15 passes params as a promise; `use()` unwraps it.
 * Header + allergy banner render from usePatient; the timeline is its own
 * query so it streams independently.
 */
export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: p, isLoading, isError } = usePatient(id);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <div className="p-7 text-[13px]" style={{ color: 'var(--sub)' }}>Loading patient…</div>;
  if (isError || !p) return <div className="p-7 text-[13px]" style={{ color: '#dc2626' }}>Failed to load patient.</div>;

  const hasHighRiskAllergy = (p.allergies ?? []).some((a: { criticality: string }) => a.criticality === 'HIGH');

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <Link href="/patients" className="flex items-center gap-1.5 text-[13px] mb-4 font-medium" style={{ color: 'var(--sub)' }}>
        <ChevronLeft size={15} /> Patients
      </Link>

      <div className="rounded-xl border p-5 mb-5 flex items-start gap-4 flex-wrap"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="w-14 h-14 rounded-full grid place-items-center text-[18px] font-semibold shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>{initials(p.firstName, p.lastName)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[20px] font-semibold tracking-tight">{p.firstName} {p.lastName}</h1>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md tabular-nums"
              style={{ background: 'var(--faint)', color: 'var(--text)' }}>{BLOOD_LABEL[p.bloodGroup]}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[13px] flex-wrap" style={{ color: 'var(--sub)' }}>
            <span className="font-mono tabular-nums">{p.mrn}</span><span>·</span>
            <span>{ageFrom(p.dateOfBirth)} yrs</span><span>·</span>
            <span>{p.gender === 'FEMALE' ? 'Female' : 'Male'}</span><span>·</span>
            <span className="tabular-nums">{fmtDate(p.dateOfBirth)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasHighRiskAllergy && (
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg text-[12px] font-medium"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              <ShieldAlert size={15} /> High-risk allergy on file
            </div>
          )}
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12px] font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--card)' }}>
            <Pencil size={14} /> Edit
          </button>
        </div>
      </div>

      {editing && (
        <PatientFormModal
          patientId={id}
          initial={{
            firstName: p.firstName, lastName: p.lastName, gender: p.gender,
            dateOfBirth: p.dateOfBirth?.slice(0, 10), bloodGroup: p.bloodGroup,
            phone: p.phone, email: p.email ?? '', addressLine: p.addressLine ?? '',
            city: p.city ?? '', country: p.country ?? '',
          }}
          onClose={() => setEditing(false)}
        />
      )}

      <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="px-4 h-11 flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-[13px] font-semibold">Clinical timeline</h3>
        </div>
        <div className="p-5">
          <PatientTimeline patientId={id} />
        </div>
      </div>
    </div>
  );
}
