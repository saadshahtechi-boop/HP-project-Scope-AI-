'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { usePatients } from '../api/use-patients';
import { PatientFormModal } from './patient-form-modal';
import { BLOOD_LABEL, ageFrom, initials } from '../../../lib/utils';

/**
 * Patient list wired to the API via usePatients. The same markup the artifact
 * rendered from mock data now renders from the live paginated endpoint, with
 * loading / error / empty states the mock version didn't need.
 */
export function PatientList() {
  const [search, setSearch] = useState('');
  const [registering, setRegistering] = useState(false);
  const { data, isLoading, isError } = usePatients({ search: search || undefined });

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Patients</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>
            {data ? `${data.pagination.total} registered · showing ${data.data.length}` : 'Loading…'}
          </p>
        </div>
        <button onClick={() => setRegistering(true)} className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-medium text-white shadow-sm"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} /> Register patient
        </button>
      </div>

      {registering && <PatientFormModal onClose={() => setRegistering(false)} />}

      <div className="flex items-center gap-2 mb-4 px-3 h-10 rounded-lg border max-w-sm"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <Search size={15} style={{ color: '#94a3b8' }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, MRN, or phone"
          className="bg-transparent outline-none text-[13px] flex-1" style={{ color: 'var(--text)' }} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        {isLoading && <div className="p-8 text-center text-[13px]" style={{ color: 'var(--sub)' }}>Loading patients…</div>}
        {isError && <div className="p-8 text-center text-[13px]" style={{ color: '#dc2626' }}>Failed to load patients. Is the API running?</div>}
        {data && data.data.length === 0 && <div className="p-8 text-center text-[13px]" style={{ color: 'var(--sub)' }}>No patients match your search.</div>}
        {data && data.data.length > 0 && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--sub)', background: 'var(--faint)' }}>
                <th className="font-medium px-4 py-2.5">Patient</th>
                <th className="font-medium px-4 py-2.5 hidden sm:table-cell">MRN</th>
                <th className="font-medium px-4 py-2.5">Age / Sex</th>
                <th className="font-medium px-4 py-2.5 hidden md:table-cell">Blood</th>
                <th className="font-medium px-4 py-2.5 hidden lg:table-cell">Phone</th>
                <th className="font-medium px-4 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((p) => (
                <tr key={p.id} className="group transition-colors hover:[background:var(--hover)]"
                  style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <Link href={`/patients/${p.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-semibold shrink-0"
                        style={{ background: 'var(--hover)', color: 'var(--accent)' }}>{initials(p.firstName, p.lastName)}</div>
                      <div className="leading-tight">
                        <div className="text-[13px] font-medium">{p.firstName} {p.lastName}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--sub)' }}>{p.mrn}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] tabular-nums">{ageFrom(p.dateOfBirth)}</span>
                    <span className="text-[12px] ml-1.5" style={{ color: 'var(--sub)' }}>{p.gender === 'FEMALE' ? 'F' : p.gender === 'MALE' ? 'M' : '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md tabular-nums"
                      style={{ background: 'var(--faint)', color: 'var(--text)' }}>{BLOOD_LABEL[p.bloodGroup]}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[12px] tabular-nums" style={{ color: 'var(--sub)' }}>{p.phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/patients/${p.id}`}>
                      <ChevronRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--sub)' }} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
