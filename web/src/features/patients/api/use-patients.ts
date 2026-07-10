import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

/**
 * Query hooks for the Patients feature. These return exactly the shapes the
 * PatientList / PatientProfile / timeline components already consume in the
 * artifact, so porting is a drop-in: swap the mock constants for these hooks.
 */

export interface PatientListItem {
  id: string; mrn: string; firstName: string; lastName: string;
  gender: string; dateOfBirth: string; bloodGroup: string; phone: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function usePatients(params: { page?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<PatientListItem>>('/patients', { params });
      return data;
    },
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data } = await api.get(`/patients/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export interface TimelineEvent {
  type: 'ENCOUNTER' | 'DIAGNOSIS' | 'OBSERVATION' | 'PRESCRIPTION' | 'LAB_ORDER' | 'PROCEDURE';
  date: string; title: string; detail?: string;
  meta?: Record<string, unknown>;
}

export function usePatientTimeline(id: string) {
  return useQuery({
    queryKey: ['patient-timeline', id],
    queryFn: async () => {
      const { data } = await api.get<TimelineEvent[]>(`/patients/${id}/timeline`);
      return data;
    },
    enabled: !!id,
  });
}

// --- Mutations ---------------------------------------------------------------

export interface AllergyInput {
  substanceCode: string;
  substanceDisplay: string;
  reaction?: string;
  criticality?: string; // LOW | HIGH | UNABLE_TO_ASSESS
}

export interface HistoryInput {
  type: string; // PAST_MEDICAL | PAST_SURGICAL | FAMILY
  summary: string;
}

export interface PatientFormInput {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;   // ISO date (YYYY-MM-DD)
  bloodGroup?: string;
  phone: string;
  email?: string;
  addressLine?: string;
  city?: string;
  country?: string;
  allergies?: AllergyInput[];
  histories?: HistoryInput[];
}

/** Register a new patient against POST /patients; refreshes the list on success. */
export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PatientFormInput) =>
      (await api.post<PatientListItem>('/patients', input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

/** Edit an existing patient via PATCH /patients/:id; refreshes list + profile. */
export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PatientFormInput>) =>
      (await api.patch(`/patients/${id}`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['patient', id] });
    },
  });
}
