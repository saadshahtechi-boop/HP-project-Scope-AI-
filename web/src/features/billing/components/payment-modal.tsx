'use client';

import { useState } from 'react';
import { X, Loader2, DollarSign } from 'lucide-react';
import { useRecordPayment } from '../api/use-billing';

const METHODS = [['CASH', 'Cash'], ['CARD', 'Card'], ['INSURANCE', 'Insurance'], ['BANK_TRANSFER', 'Bank transfer'], ['MOBILE_MONEY', 'Mobile money']];

/**
 * Records a payment against one invoice. Amount defaults to the outstanding
 * balance (the common case: settle in full), but is editable for part-payments.
 */
export function PaymentModal({
  invoiceId, invoiceNumber, outstanding, onClose,
}: {
  invoiceId: string; invoiceNumber: string; outstanding: number; onClose: () => void;
}) {
  const record = useRecordPayment(invoiceId);
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) return setError('Enter an amount greater than zero.');
    if (value > outstanding + 0.001) return setError(`Amount exceeds the outstanding balance of $${outstanding.toFixed(2)}.`);
    record.mutate(
      { amount: value, method, reference: reference || undefined },
      { onSuccess: onClose, onError: () => setError('Could not record the payment. Please try again.') },
    );
  };

  const field = { borderColor: 'var(--border)', background: 'var(--faint)', color: 'var(--text)' };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-sm rounded-xl border shadow-xl" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="flex items-center justify-between px-5 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2"><DollarSign size={16} style={{ color: '#059669' }} /><h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Record payment</h2></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg" style={{ color: 'var(--sub)' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-[12px]" style={{ color: 'var(--sub)' }}>Invoice <span className="font-mono font-medium" style={{ color: 'var(--text)' }}>{invoiceNumber}</span> · outstanding <span className="font-semibold tabular-nums" style={{ color: 'var(--text)' }}>${outstanding.toFixed(2)}</span></div>
          <div>
            <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Amount</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none tabular-nums" style={field} />
          </div>
          <div>
            <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div>
            <label className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>Reference <span style={{ color: 'var(--sub)' }}>(optional)</span></label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID, cheque no." className="w-full mt-1 rounded-lg border px-3 h-10 text-[13px] outline-none" style={field} />
          </div>
          {error && <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 h-16 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--sub)', background: 'var(--card)' }}>Cancel</button>
          <button onClick={submit} disabled={record.isPending} className="h-9 px-4 rounded-lg text-[13px] font-medium text-white flex items-center gap-2 disabled:opacity-60" style={{ background: '#059669' }}>
            {record.isPending && <Loader2 size={14} className="animate-spin" />}
            {record.isPending ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
