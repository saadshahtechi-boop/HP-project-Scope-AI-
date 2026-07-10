import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

/**
 * Consultation workspace hooks. The workspace load is a read; completing the
 * visit is the app's first write mutation — it posts SOAP + diagnoses +
 * prescriptions to the atomic /complete endpoint, then invalidates the queue and
 * dashboard so those screens reflect the finished visit.
 */

export interface WorkspaceData {
  encounter: {
    id: string;
    patient: {
      id: string; firstName: string; lastName: string; mrn: string;
      gender: string; dateOfBirth: string; bloodGroup: string;
      allergies: { substanceDisplay: string; reaction?: string | null; criticality: string }[];
      histories: { type: string; summary: string }[];
    };
    practitioner: { firstName: string; lastName: string; specialty?: string | null };
    soapNote?: { subjective: string; objective: string; assessment: string; plan: string } | null;
  };
  currentMeds: { medicationDisplay: string; dosage: string; frequency: string }[];
  recentLabs: { display: string; valueNumber?: number | null; unit?: string | null; isAbnormal?: boolean | null; effectiveAt: string }[];
  recentVitals: { display: string; valueNumber?: number | null; unit?: string | null; isAbnormal?: boolean | null }[];
}

export function useWorkspace(encounterId: string) {
  return useQuery({
    queryKey: ['consultation-workspace', encounterId],
    queryFn: async () => (await api.get<WorkspaceData>(`/consultations/${encounterId}/workspace`)).data,
    enabled: !!encounterId,
  });
}

export interface CompleteVisitPayload {
  soap: { subjective: string; objective: string; assessment: string; plan: string; aiGenerated?: boolean };
  diagnoses?: { code: string; display: string }[];
  prescriptions?: { medicationCode: string; medicationDisplay: string; dosage: string; frequency: string; durationDays?: number; quantity?: number }[];
  followUpDays?: number;
}

export function useCompleteVisit(encounterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CompleteVisitPayload) =>
      (await api.post(`/consultations/${encounterId}/complete`, payload)).data,
    onSuccess: () => {
      // The finished visit changes the queue and today's dashboard figures.
      qc.invalidateQueries({ queryKey: ['queue-board'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}
