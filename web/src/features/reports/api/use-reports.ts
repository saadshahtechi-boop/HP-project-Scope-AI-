import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

export interface DoctorPerf { practitionerId: string; name: string; specialty?: string | null; consultations: number; }
export function useDoctorPerformance() {
  return useQuery({
    queryKey: ['doctor-performance'],
    queryFn: async () => (await api.get<DoctorPerf[]>('/reports/doctors/performance')).data,
  });
}

export interface GrowthPoint { date: string; newPatients: number; total: number; }
export function usePatientGrowth() {
  return useQuery({
    queryKey: ['patient-growth'],
    queryFn: async () => (await api.get<GrowthPoint[]>('/reports/patients/growth')).data,
  });
}
