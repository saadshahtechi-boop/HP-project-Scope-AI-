import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export interface AppointmentItem {
  id: string; status: string; reason?: string | null;
  scheduledStart: string; scheduledEnd: string;
  patient: { firstName: string; lastName: string; mrn: string };
  practitioner: { firstName: string; lastName: string; specialty?: string | null };
}

export function useAppointments(date?: string) {
  return useQuery({
    queryKey: ['appointments', date],
    queryFn: async () => (await api.get<{ data: AppointmentItem[] }>('/appointments', { params: { date } })).data,
  });
}

export interface CreateAppointmentInput {
  patientId: string;
  practitionerId: string;
  scheduledStart: string; // ISO
  scheduledEnd: string;    // ISO
  reason?: string;
}

/**
 * Books an appointment against the real POST /appointments endpoint (which
 * validates end-after-start and rejects doctor overlaps with a 409). On success
 * it invalidates the schedule so the new slot appears without a manual refresh.
 */
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) =>
      (await api.post<AppointmentItem>('/appointments', input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
}

// Pickers for the booking form ------------------------------------------------

export interface PatientOption { id: string; firstName: string; lastName: string; mrn: string; }
export function usePatientOptions(search: string) {
  return useQuery({
    queryKey: ['patient-options', search],
    queryFn: async () =>
      (await api.get<{ data: PatientOption[] }>('/patients', { params: { search, limit: 8 } })).data,
    enabled: search.length >= 2,
  });
}

export interface PractitionerOption { id: string; firstName: string; lastName: string; specialty?: string | null; }
export function usePractitioners() {
  return useQuery({
    queryKey: ['practitioners'],
    queryFn: async () => (await api.get<PractitionerOption[]>('/appointments/practitioners')).data,
  });
}
