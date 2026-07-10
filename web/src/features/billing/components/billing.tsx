'use client';

import { useState } from 'react';
import { Receipt, DollarSign } from 'lucide-react';
import { useInvoices, useOutstanding, type InvoiceItem } from '../api/use-billing';
import { PaymentModal } from './payment-modal';
import { fmtDate } from '../../../lib/utils';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: '#94a3b8', ISSUED: '#2563eb', PARTIALLY_PAID: '#d97706',
  PAID: '#059669', VOID: '#94a3b8', REFUNDED: '#7c3aed',
};

export function Billing() {
  const { data, isLoading, isError } = useInvoices();
  const { data: outstanding } = useOutstanding();
  const [payTarget, setPayTarget] = useState<InvoiceItem | null>(null);

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Billing</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Invoices &amp; payments</p>
        </div>
        {outstanding && (
          <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: '#d977061a' }}><DollarSign size={17} style={{ color: '#d97706' }} /></div>
            <div>
              <div className="text-[18px] font-semibold tabular-nums">${outstanding.outstanding.toLocaleString()}</div>
              <div className="text-[11px]" style={{ color: 'var(--sub)' }}>Outstanding · {outstanding.count} invoices</div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        {isLoading && <div className="p-8 text-center text-[13px]" style={{ color: 'var(--sub)' }}>Loading invoices…</div>}
        {isError && <div className="p-8 text-center text-[13px]" style={{ color: '#dc2626' }}>Failed to load. Is the API running?</div>}
        {data && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--sub)', background: 'var(--faint)' }}>
                <th className="font-medium px-4 py-2.5">Invoice</th>
                <th className="font-medium px-4 py-2.5">Patient</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5 text-right">Total</th>
                <th className="font-medium px-4 py-2.5 text-right hidden sm:table-cell">Paid</th>
                <th className="font-medium px-4 py-2.5 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-mono font-medium tabular-nums">{inv.number}</div>
                    <div className="text-[11px]" style={{ color: 'var(--sub)' }}>{fmtDate(inv.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px]">{inv.patient.firstName} {inv.patient.lastName}</div>
                    <div className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--sub)' }}>{inv.patient.mrn}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${STATUS_STYLE[inv.status]}1a`, color: STATUS_STYLE[inv.status] }}>{inv.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums hidden sm:table-cell" style={{ color: 'var(--sub)' }}>${Number(inv.amountPaid).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                      <button onClick={() => setPayTarget(inv)} className="text-[11px] font-medium px-2.5 h-7 rounded-md text-white" style={{ background: '#059669' }}>
                        Record payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {payTarget && (
        <PaymentModal
          invoiceId={payTarget.id}
          invoiceNumber={payTarget.number}
          outstanding={Number(payTarget.total) - Number(payTarget.amountPaid)}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );
}
