'use client';

import { useState } from 'react';
import { X, Loader2, UserPlus, Plus, Trash2 } from 'lucide-react';
import { useCreatePatient, useUpdatePatient, type PatientFormInput, type AllergyInput, type HistoryInput } from '../api/use-patients';

const GENDERS = [['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHER', 'Other'], ['UNKNOWN', 'Unknown']];
const BLOOD = [['', '—'], ['A_POS', 'A+'], ['A_NEG', 'A−'], ['B_POS', 'B+'], ['B_NEG', 'B−'], ['AB_POS', 'AB+'], ['AB_NEG', 'AB−'], ['O_POS', 'O+'], ['O_NEG', 'O−']];
const HISTORY_TYPES = [['PAST_MEDICAL', 'Past medical'], ['PAST_SURGICAL', 'Past surgical'], ['FAMILY', 'Family']];
const CRITICALITY = [['LOW', 'Low'], ['HIGH', 'High'], ['UNABLE_TO_ASSESS', 'Unknown']];

/**
 * Register/edit form. Fields map 1:1 to CreatePatientDto: the required set is
 * firstName, lastName, gender, dateOfBirth, phone; the rest are optional. Used
 * for both create (no `patientId`) and edit (with `patientId` + `initial`).
 */
export function PatientFormModal({
  onClose, patientId, initial,
}: {
  onClose: () => void;
  patientId?: string;
  initial?: Partial<PatientFormInput>;
}) {
  const create = useCreatePatient();
  const update = useUpdatePatient(patientId ?? '');
  const isEdit = !!patientId;
  const pending = create.isPending || update.isPending;

  const [form, setForm] = useState<PatientFormInput>({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    gender: initial?.gender ?? 'FEMALE',
    dateOfBirth: initial?.dateOfBirth ?? '',
    bloodGroup: initial?.bloodGroup ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    addressLine: initial?.addressLine ?? '',
    city: initial?.city ?? '',
    country: initial?.country ?? '',
  });
  const [allergies, setAllergies] = useState<AllergyInput[]>(initial?.allergies ?? []);
  const [histories, setHistories] = useState<HistoryInput[]>(initial?.histories ?? []);
  const [error, setError] = useState<string | null>(null);

  const addAllergy = () => setAllergies((a) => [...a, { substanceCode: '', substanceDisplay: '', reaction: '', criticality: 'LOW' }]);
  const setAllergy = (i: number, k: keyof AllergyInput, v: string) => setAllergies((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const removeAllergy = (i: number) => setAllergies((a) => a.filter((_, j) => j !== i));

  const addHistory = () => setHistories((h) => [...h, { type: 'PAST_MEDICAL', summary: '' }]);
  const setHistory = (i: number, k: keyof HistoryInput, v: string) => setHistories((h) => h.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const removeHistory = (i: number) => setHistories((h) => h.filter((_, j) => j !== i));

  const set = (k: keyof PatientFormInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('First and last name are required.');
    if (!form.dateOfBirth) return setError('Date of birth is required.');
    if (!form.phone.trim()) return setError('Phone number is required.');

    // Strip empty optionals so we don't send blank strings the DTO would reject.
    const payload: PatientFormInput = { ...form };
    (['bloodGroup', 'email', 'addressLine', 'city', 'country'] as const).forEach((k) => {
      if (!payload[k]) delete payload[k];
    });

    // Only include history/allergy rows the user actually filled in.
    const cleanAllergies = allergies
      .filter((a) => a.substanceDisplay.trim())
      .map((a) => ({ ...a, substanceCode: a.substanceCode.trim() || a.substanceDisplay.trim().toUpperCase().replace(/\s+/g, '_'), reaction: a.reaction?.trim() || undefined }));
    const cleanHistories = histories.filter((h) => h.summary.trim());
    if (cleanAllergies.length) payload.allergies = cleanAllergies;
    if (cleanHistories.length) payload.histories = cleanHistories;

    const onError = () => setError('Could not save the patient. Please check the fields and try again.');
    if (isEdit) update.mutate(payload, { onSuccess: onClose, onError });
    else create.mutate(payload, { onSuccess: onClose, onError });
  };

  const field = { borderColor: 'var(--border)', background: 'var(--faint)', color: 'var(--text)' };
  const Label = ({ children }: { children: React.ReactNode }) => <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>{children}</label>;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-6 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-xl border shadow-xl" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center justify-between px-5 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2"><UserPlus size={16} style={{ color: 'var(--accent)' }} /><h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{isEdit ? 'Edit patient' : 'Register patient'}</h2></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg" style={{ color: 'var(--sub)' }}><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name *</Label><input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
            <div><Label>Last name *</Label><input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Gender *</Label><select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="w-full mt-1 rounded-lg border px-2 h-10 text-[13px] outline-none" style={field}>{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><Label>Date of birth *</Label><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="w-full mt-1 rounded-lg border px-2 h-10 text-[13px] outline-none" style={field} /></div>
            <div><Label>Blood group</Label><select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} className="w-full mt-1 rounded-lg border px-2 h-10 text-[13px] outline-none" style={field}>{BLOOD.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone *</Label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 …" className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
            <div><Label>Email</Label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
          </div>
          <div><Label>Address</Label><input value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><input value={form.city} onChange={(e) => set('city', e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
            <div><Label>Country</Label><input value={form.country} onChange={(e) => set('country', e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
          </div>

          {/* Allergies */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>Allergies</span>
              <button onClick={addAllergy} className="flex items-center gap-1 text-[11px] font-medium px-2 h-7 rounded-md" style={{ background: 'var(--hover)', color: 'var(--accent)' }}><Plus size={12} /> Add allergy</button>
            </div>
            {allergies.length === 0 && <p className="text-[11.5px]" style={{ color: 'var(--sub)' }}>None recorded.</p>}
            <div className="space-y-2">
              {allergies.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={a.substanceDisplay} onChange={(e) => setAllergy(i, 'substanceDisplay', e.target.value)} placeholder="Substance (e.g. Penicillin)" className="flex-1 rounded-lg border px-2.5 h-9 text-[12.5px] outline-none" style={field} />
                  <input value={a.reaction} onChange={(e) => setAllergy(i, 'reaction', e.target.value)} placeholder="Reaction" className="flex-1 rounded-lg border px-2.5 h-9 text-[12.5px] outline-none" style={field} />
                  <select value={a.criticality} onChange={(e) => setAllergy(i, 'criticality', e.target.value)} className="w-24 rounded-lg border px-2 h-9 text-[12.5px] outline-none" style={field}>{CRITICALITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  <button onClick={() => removeAllergy(i)} className="w-8 h-9 grid place-items-center rounded-lg" style={{ color: '#94a3b8' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Medical history */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>Medical history</span>
              <button onClick={addHistory} className="flex items-center gap-1 text-[11px] font-medium px-2 h-7 rounded-md" style={{ background: 'var(--hover)', color: 'var(--accent)' }}><Plus size={12} /> Add entry</button>
            </div>
            {histories.length === 0 && <p className="text-[11.5px]" style={{ color: 'var(--sub)' }}>None recorded.</p>}
            <div className="space-y-2">
              {histories.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={h.type} onChange={(e) => setHistory(i, 'type', e.target.value)} className="w-32 rounded-lg border px-2 h-9 text-[12.5px] outline-none" style={field}>{HISTORY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  <input value={h.summary} onChange={(e) => setHistory(i, 'summary', e.target.value)} placeholder="e.g. Hypertension since 2019, on amlodipine" className="flex-1 rounded-lg border px-2.5 h-9 text-[12.5px] outline-none" style={field} />
                  <button onClick={() => removeHistory(i)} className="w-8 h-9 grid place-items-center rounded-lg" style={{ color: '#94a3b8' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 h-16 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--sub)', background: 'var(--card)' }}>Cancel</button>
          <button onClick={submit} disabled={pending} className="h-9 px-4 rounded-lg text-[13px] font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
            {pending && <Loader2 size={14} className="animate-spin" />}
            {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Register patient'}
          </button>
        </div>
      </div>
    </div>
  );
}
