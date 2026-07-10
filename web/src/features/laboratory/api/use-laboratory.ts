import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export interface LabOrder {
  id: string; code: string; display: string; status: string; priority: string;
  createdAt: string;
  patient: { firstName: string; lastName: string; mrn: string };
  requester: { firstName: string; lastName: string };
  report?: { id: string; status: string } | null;
}

export function useLabWorklist(status?: string) {
  return useQuery({
    queryKey: ['lab-worklist', status],
    queryFn: async () =>
      (await api.get<{ data: LabOrder[]; pagination: unknown }>('/laboratory/orders', { params: { status } })).data,
    refetchInterval: 15_000,
  });
}

export function useLabSummary() {
  return useQuery({
    queryKey: ['lab-summary'],
    queryFn: async () => (await api.get<Record<string, number>>('/laboratory/summary')).data,
  });
}

export function useAdvanceLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/laboratory/orders/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-worklist'] });
      qc.invalidateQueries({ queryKey: ['lab-summary'] });
    },
  });
}
