import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export interface RxQueueItem {
  id: string; medicationDisplay: string; dosage: string; frequency: string;
  quantity?: number | null; outstandingQty: number;
  patient: { firstName: string; lastName: string; mrn: string };
  prescriber: { firstName: string; lastName: string };
  medicine?: { name: string } | null;
}

export function usePharmacyQueue() {
  return useQuery({
    queryKey: ['pharmacy-queue'],
    queryFn: async () => (await api.get<{ data: RxQueueItem[] }>('/pharmacy/queue')).data,
    refetchInterval: 15_000,
  });
}

export function useDispense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (medicationRequestId: string) =>
      (await api.post(`/pharmacy/dispense/${medicationRequestId}`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-queue'] }),
  });
}
