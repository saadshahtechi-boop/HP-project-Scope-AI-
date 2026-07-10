'use client';

import { useState } from 'react';
import { X, Loader2, PackagePlus } from 'lucide-react';
import { useReceiveStock, type InventoryItem } from '../api/use-inventory';

/**
 * Receive a new stock batch for an existing medicine. Medicine is chosen from
 * the current inventory list (passed in) so the id is always valid.
 */
export function ReceiveStockModal({ medicines, onClose }: { medicines: InventoryItem[]; onClose: () => void }) {
  const receive = useReceiveStock();
  const [medicineId, setMedicineId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [expiryDate, setExpiryDate] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!medicineId) return setError('Select a medicine.');
    if (!batchNumber.trim()) return setError('Enter a batch number.');
    if (!Number(quantity) || Number(quantity) < 1) return setError('Quantity must be at least 1.');
    if (!expiryDate) return setError('Enter an expiry date.');
    if (costPrice === '' || Number(costPrice) < 0) return setError('Enter a valid cost price.');

    receive.mutate(
      {
        medicineId, batchNumber: batchNumber.trim(),
        quantity: Number(quantity),
        expiryDate: new Date(expiryDate).toISOString(),
        costPrice: Number(costPrice),
      },
      { onSuccess: onClose, onError: () => setError('Could not receive stock. A batch number may already exist for this medicine.') },
    );
  };

  const field = { borderColor: 'var(--border)', background: 'var(--faint)', color: 'var(--text)' };
  const Label = ({ children }: { children: React.ReactNode }) => <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>{children}</label>;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-xl border shadow-xl" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center justify-between px-5 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2"><PackagePlus size={16} style={{ color: 'var(--accent)' }} /><h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Receive stock</h2></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg" style={{ color: 'var(--sub)' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label>Medicine</Label>
            <select value={medicineId} onChange={(e) => setMedicineId(e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field}>
              <option value="">Select a medicine…</option>
              {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Batch number</Label><input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. AMX-2026-014" className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} /></div>
            <div><Label>Quantity</Label><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none tabular-nums" style={field} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Expiry date</Label><input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full mt-1 rounded-lg border px-2 h-10 text-[13px] outline-none" style={field} /></div>
            <div><Label>Cost price (each)</Label><input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none tabular-nums" style={field} /></div>
          </div>
          {error && <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 h-16 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--sub)', background: 'var(--card)' }}>Cancel</button>
          <button onClick={submit} disabled={receive.isPending} className="h-9 px-4 rounded-lg text-[13px] font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--accent)' }}>
            {receive.isPending && <Loader2 size={14} className="animate-spin" />}
            {receive.isPending ? 'Saving…' : 'Receive stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
