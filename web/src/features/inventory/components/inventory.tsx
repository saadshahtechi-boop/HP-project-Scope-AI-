'use client';

import { useState } from 'react';
import { Search, AlertTriangle, Clock, PackagePlus } from 'lucide-react';
import { useInventory, useInventoryAlerts } from '../api/use-inventory';
import { ReceiveStockModal } from './receive-stock-modal';
import { fmtDate } from '../../../lib/utils';

export function Inventory() {
  const [search, setSearch] = useState('');
  const [receiving, setReceiving] = useState(false);
  const { data, isLoading, isError } = useInventory(search || undefined);
  const { data: alerts } = useInventoryAlerts();

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto w-full">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Inventory</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--sub)' }}>Medicine stock · derived from movement ledger</p>
        </div>
        <button onClick={() => setReceiving(true)} className="flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-medium text-white shadow-sm" style={{ background: 'var(--accent)' }}>
          <PackagePlus size={16} /> Receive stock
        </button>
      </div>

      {receiving && data && <ReceiveStockModal medicines={data.data} onClose={() => setReceiving(false)} />}

      {alerts && (alerts.counts.lowStock > 0 || alerts.counts.nearExpiry > 0 || alerts.counts.expired > 0) && (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border p-3.5" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
            <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: '#dc2626' }}><AlertTriangle size={14} /> Low stock</div>
            <div className="text-[20px] font-semibold mt-1 tabular-nums" style={{ color: '#dc2626' }}>{alerts.counts.lowStock}</div>
          </div>
          <div className="rounded-xl border p-3.5" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
            <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: '#d97706' }}><Clock size={14} /> Near expiry</div>
            <div className="text-[20px] font-semibold mt-1 tabular-nums" style={{ color: '#d97706' }}>{alerts.counts.nearExpiry}</div>
          </div>
          <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: 'var(--sub)' }}><AlertTriangle size={14} /> Expired</div>
            <div className="text-[20px] font-semibold mt-1 tabular-nums">{alerts.counts.expired}</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 px-3 h-10 rounded-lg border max-w-sm" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <Search size={15} style={{ color: '#94a3b8' }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines"
          className="bg-transparent outline-none text-[13px] flex-1" style={{ color: 'var(--text)' }} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        {isLoading && <div className="p-8 text-center text-[13px]" style={{ color: 'var(--sub)' }}>Loading inventory…</div>}
        {isError && <div className="p-8 text-center text-[13px]" style={{ color: '#dc2626' }}>Failed to load. Is the API running?</div>}
        {data && (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--sub)', background: 'var(--faint)' }}>
                <th className="font-medium px-4 py-2.5">Medicine</th>
                <th className="font-medium px-4 py-2.5 hidden sm:table-cell">Form</th>
                <th className="font-medium px-4 py-2.5">On hand</th>
                <th className="font-medium px-4 py-2.5 hidden md:table-cell">Reorder</th>
                <th className="font-medium px-4 py-2.5">Price</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((m) => (
                <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium">{m.name}</div>
                    {m.genericName && <div className="text-[11px]" style={{ color: 'var(--sub)' }}>{m.genericName}</div>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[12px]" style={{ color: 'var(--sub)' }}>{m.form ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: m.lowStock ? '#dc2626' : 'var(--text)' }}>
                      {m.lowStock && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: '#ef4444' }} />}
                      {m.onHand}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[12px] tabular-nums" style={{ color: 'var(--sub)' }}>{m.reorderLevel}</td>
                  <td className="px-4 py-3 text-[13px] tabular-nums">${Number(m.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
