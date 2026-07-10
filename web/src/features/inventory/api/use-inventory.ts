import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export interface InventoryItem {
  id: string; name: string; genericName?: string | null; form?: string | null;
  unitPrice: string; reorderLevel: number; onHand: number; lowStock: boolean;
}

export function useInventory(search?: string) {
  return useQuery({
    queryKey: ['inventory', search],
    queryFn: async () => (await api.get<{ data: InventoryItem[] }>('/inventory', { params: { search } })).data,
  });
}

export interface InventoryAlerts {
  counts: { lowStock: number; expired: number; nearExpiry: number };
  lowStock: { id: string; name: string; onHand: number; reorderLevel: number }[];
  nearExpiry: { batchId: string; medicine: string; batchNumber: string; expiryDate: string; quantityOnHand: number }[];
  expired: { batchId: string; medicine: string; batchNumber: string; expiryDate: string; quantityOnHand: number }[];
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: async () => (await api.get<InventoryAlerts>('/inventory/alerts')).data,
  });
}

// --- Mutations ---------------------------------------------------------------

export interface ReceiveStockInput {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string; // ISO date
  costPrice: number;
  barcode?: string;
}

/**
 * Receive a stock batch (POST /inventory/receive). Adds a movement to the ledger
 * from which on-hand is derived, so the list + alerts refresh on success.
 */
export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReceiveStockInput) =>
      (await api.post('/inventory/receive', input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-alerts'] });
    },
  });
}
