import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export interface InvoiceItem {
  id: string; number: string; status: string;
  total: string; amountPaid: string;
  patient: { firstName: string; lastName: string; mrn: string };
  createdAt: string;
}

export function useInvoices(status?: string) {
  return useQuery({
    queryKey: ['invoices', status],
    queryFn: async () => (await api.get<{ data: InvoiceItem[] }>('/billing/invoices', { params: { status } })).data,
  });
}

export function useOutstanding() {
  return useQuery({
    queryKey: ['outstanding'],
    queryFn: async () => (await api.get<{ count: number; outstanding: number }>('/billing/invoices/outstanding')).data,
  });
}

// --- Mutations ---------------------------------------------------------------

export interface RecordPaymentInput {
  amount: number;
  method: string;
  reference?: string;
}

/**
 * Record a payment against an invoice (POST /billing/invoices/:id/payments).
 * The backend re-derives invoice status from the payment total, so we just
 * invalidate the lists and let the fresh status flow back.
 */
export function useRecordPayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) =>
      (await api.post(`/billing/invoices/${invoiceId}/payments`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['outstanding'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
