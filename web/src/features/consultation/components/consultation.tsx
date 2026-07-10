'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert, Sparkles, Plus, Trash2, Check, Pill, Activity, Search,
} from 'lucide-react';
import { useWorkspace, useCompleteVisit } from '../api/use-consultation';
import { BLOOD_LABEL, ageFrom, initials } from '../../../lib/utils';

interface RxRow { id: number; drug: string; dosage: string; frequency: string; duration: string; }

/**
 * Consultation workspace: left side is read-only clinical context loaded from
 * the API; right side is the editable document (SOAP, diagnoses, prescriptions)
 * held in local form state and submitted atomically via useCompleteVisit.
 */
export function Consultation({ encounterId }: { encounterId: string }) {
  const { data, isLoading, isError } = useWorkspace(encounterId);
  const complete = useCompleteVisit(encounterId);

  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [diagnoses, setDiagnoses] = useState<{ code: string; display: string }[]>([]);
  const [dxQuery, setDxQuery] = useState('');
  const [rxList, setRxList] = useState<RxRow[]>([]);

  // Seed the form from any existing SOAP note once the workspace loads.
  useEffect(() => {
    if (data?.encounter.soapNote) {
      const s = data.encounter.soapNote;
      setSoap({ subjective: s.subjective, objective: s.objective, assessment: s.assessment, plan: s.plan });
    }
  }, [data]);

  if (isLoading) return <div className="p-7 text-[13px]" style={{ color: 'var(--sub)' }}>Loading consultation…</div>;
  if (isError || !data) return <div className="p-7 text-[13px]" style={{ color: '#dc2626' }}>Failed to load consultation. Is the API running?</div>;

  const p = data.encounter.patient;
  const hasHighRisk = p.allergies.some((a) => a.criticality === 'HIGH');

  const addRx = () => setRxList([...rxList, { id: Date.now(), drug: '', dosage: '', frequency: 'OD', duration: '7' }]);
  const updateRx = (id: number, k: keyof RxRow, v: string) => setRxList(rxList.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const removeRx = (id: number) => setRxList(rxList.filter((r) => r.id !== id));

  const onComplete = () => {
    complete.mutate({
      soap,
      diagnoses,
      prescriptions: rxList.filter((r) => r.drug.trim()).map((r) => ({
        medicationCode: r.drug, medicationDisplay: r.drug,
        dosage: r.dosage, frequency: r.frequency,
        durationDays: Number(r.duration) || undefined,
      })),
    });
  };

  const inputStyle = { borderColor: 'var(--border)', background: 'var(--faint)', color: 'var(--text)' };

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full grid place-items-center text-[16px] font-semibold shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>{initials(p.firstName, p.lastName)}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[19px] font-semibold tracking-tight">{p.firstName} {p.lastName}</h1>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums" style={{ background: 'var(--faint)', color: 'var(--text)' }}>{BLOOD_LABEL[p.bloodGroup]}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[12px]" style={{ color: 'var(--sub)' }}>
              <span className="font-mono tabular-nums">{p.mrn}</span><span>·</span>
              <span>{ageFrom(p.dateOfBirth)} yrs · {p.gender === 'FEMALE' ? 'Female' : 'Male'}</span>
            </div>
          </div>
        </div>
        <button onClick={onComplete} disabled={complete.isPending}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium text-white shadow-sm disabled:opacity-60"
          style={{ background: '#059669' }}>
          <Check size={15} /> {complete.isPending ? 'Saving…' : complete.isSuccess ? 'Completed' : 'Complete visit'}
        </button>
      </div>

      {hasHighRisk && (
        <div className="flex items-center gap-2 px-3 h-10 rounded-lg text-[12.5px] font-medium mb-5"
          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
          <ShieldAlert size={15} />
          <span className="font-semibold">Allergies:</span>
          {p.allergies.map((a) => a.substanceDisplay).join(', ')}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        {/* LEFT: live clinical context */}
        <div className="lg:col-span-2 space-y-5">
          <Panel title="Vitals — recent">
            <div className="grid grid-cols-2 gap-2">
              {data.recentVitals.slice(0, 6).map((v, i) => (
                <div key={i} className="rounded-lg border p-2.5" style={{ borderColor: v.isAbnormal ? '#fecaca' : 'var(--border)', background: v.isAbnormal ? '#fef2f2' : 'var(--card)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Activity size={12} style={{ color: v.isAbnormal ? '#dc2626' : '#94a3b8' }} />
                    <span className="text-[10px] uppercase tracking-wider truncate" style={{ color: '#94a3b8' }}>{v.display}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    {v.isAbnormal && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#ef4444' }} />}
                    <span className="text-[15px] font-semibold tabular-nums font-mono" style={{ color: v.isAbnormal ? '#dc2626' : 'var(--text)' }}>{v.valueNumber ?? '—'}</span>
                    <span className="text-[10px]" style={{ color: 'var(--sub)' }}>{v.unit}</span>
                  </div>
                </div>
              ))}
              {data.recentVitals.length === 0 && <div className="text-[12px] col-span-2" style={{ color: 'var(--sub)' }}>No vitals recorded.</div>}
            </div>
          </Panel>

          <Panel title="Current medications">
            <div className="space-y-2">
              {data.currentMeds.length ? data.currentMeds.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Pill size={13} style={{ color: '#059669' }} /><span className="text-[13px]">{m.medicationDisplay}</span></div>
                  <span className="text-[11px]" style={{ color: 'var(--sub)' }}>{m.frequency}</span>
                </div>
              )) : <div className="text-[12px]" style={{ color: 'var(--sub)' }}>None on record.</div>}
            </div>
          </Panel>

          <Panel title="Recent labs">
            <div className="space-y-2.5">
              {data.recentLabs.length ? data.recentLabs.slice(0, 5).map((l, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-[12.5px] flex items-center gap-1.5">
                    {l.isAbnormal && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#ef4444' }} />}{l.display}
                  </div>
                  <span className="text-[13px] font-mono tabular-nums font-semibold" style={{ color: l.isAbnormal ? '#dc2626' : 'var(--text)' }}>
                    {l.valueNumber ?? '—'}<span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--sub)' }}>{l.unit}</span>
                  </span>
                </div>
              )) : <div className="text-[12px]" style={{ color: 'var(--sub)' }}>No recent labs.</div>}
            </div>
          </Panel>
        </div>

        {/* RIGHT: the editable document */}
        <div className="lg:col-span-3 space-y-5">
          <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-[13px] font-semibold">SOAP note</h3>
              <button onClick={() => setSoap((s) => ({ ...s, assessment: s.assessment || 'Draft assessment based on presentation and recent findings.', plan: s.plan || 'Continue current therapy; follow up as indicated.' }))}
                className="flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 h-7 rounded-md" style={{ background: '#eef2ff', color: '#6366f1' }}>
                <Sparkles size={13} /> Draft with AI
              </button>
            </div>
            <div className="p-4 space-y-3.5">
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => (
                <div key={field}>
                  <label className="text-[12px] font-semibold capitalize">{field}</label>
                  <textarea value={soap[field]} onChange={(e) => setSoap({ ...soap, [field]: e.target.value })} rows={3}
                    className="w-full mt-1.5 rounded-lg border px-3 py-2 text-[13px] outline-none resize-none focus:border-blue-500" style={inputStyle} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="px-4 h-11 flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-[13px] font-semibold">Diagnosis <span className="font-normal" style={{ color: 'var(--sub)' }}>· ICD-10</span></h3>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {diagnoses.map((d) => (
                  <span key={d.code} className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-md" style={{ background: 'var(--hover)', color: 'var(--accent)' }}>
                    <span className="font-mono font-semibold">{d.code}</span> {d.display}
                    <button onClick={() => setDiagnoses(diagnoses.filter((x) => x.code !== d.code))}>×</button>
                  </span>
                ))}
                {diagnoses.length === 0 && <span className="text-[12px]" style={{ color: 'var(--sub)' }}>No diagnosis added.</span>}
              </div>
              <div className="flex items-center gap-2 px-3 h-9 rounded-lg border" style={inputStyle}>
                <Search size={14} style={{ color: '#94a3b8' }} />
                <input value={dxQuery} onChange={(e) => setDxQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dxQuery.trim()) {
                      // Free-text add; in production this hits an ICD-10 lookup endpoint.
                      const code = dxQuery.trim().split(' ')[0].toUpperCase();
                      setDiagnoses([...diagnoses, { code, display: dxQuery.trim() }]);
                      setDxQuery('');
                    }
                  }}
                  placeholder="Type a diagnosis and press Enter" className="bg-transparent outline-none text-[13px] flex-1" style={{ color: 'var(--text)' }} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-[13px] font-semibold">Prescription</h3>
              <button onClick={addRx} className="flex items-center gap-1 text-[11.5px] font-medium px-2 h-7 rounded-md" style={{ background: 'var(--hover)', color: 'var(--accent)' }}>
                <Plus size={13} /> Add drug
              </button>
            </div>
            <div className="p-4 space-y-2">
              {rxList.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <input value={r.drug} onChange={(e) => updateRx(r.id, 'drug', e.target.value)} placeholder="Medication"
                    className="flex-1 rounded-lg border px-2.5 h-9 text-[12.5px] outline-none focus:border-blue-500" style={inputStyle} />
                  <input value={r.dosage} onChange={(e) => updateRx(r.id, 'dosage', e.target.value)} placeholder="Dose"
                    className="w-20 rounded-lg border px-2.5 h-9 text-[12.5px] outline-none focus:border-blue-500" style={inputStyle} />
                  <select value={r.frequency} onChange={(e) => updateRx(r.id, 'frequency', e.target.value)}
                    className="w-20 rounded-lg border px-2 h-9 text-[12.5px] outline-none" style={inputStyle}>
                    {['OD', 'BID', 'TID', 'QID', 'PRN'].map((f) => <option key={f}>{f}</option>)}
                  </select>
                  <input value={r.duration} onChange={(e) => updateRx(r.id, 'duration', e.target.value)}
                    className="w-12 rounded-lg border px-2 h-9 text-[12.5px] outline-none text-center tabular-nums focus:border-blue-500" style={inputStyle} />
                  <button onClick={() => removeRx(r.id)} className="w-8 h-9 grid place-items-center rounded-lg" style={{ color: '#94a3b8' }}><Trash2 size={14} /></button>
                </div>
              ))}
              {rxList.length === 0 && <div className="text-[12px]" style={{ color: 'var(--sub)' }}>No medications added.</div>}
            </div>
          </div>

          {complete.isError && (
            <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
              Failed to save the visit. Please try again.
            </div>
          )}
          {complete.isSuccess && (
            <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#f0fdf4', color: '#059669' }}>
              Visit completed — SOAP note, diagnoses, and prescriptions saved.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="px-4 h-11 flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
