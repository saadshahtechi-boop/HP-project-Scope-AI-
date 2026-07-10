import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

/**
 * Hooks for the dashboard, mapping to ReportsService endpoints. Each returns the
 * exact shape that service produces, so the components render live aggregates.
 */

export interface DashboardSummary {
  todaysPatients: number;
  todaysAppointments: number;
  completedConsultations: number;
  waitingPatients: number;
  todaysRevenue: number;
  pendingBills: number;
  doctorsAvailable: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get<DashboardSummary>('/reports/dashboard')).data,
  });
}

export interface RevenuePoint { date: string; revenue: number; }
export function useRevenueSeries() {
  return useQuery({
    queryKey: ['revenue-series'],
    queryFn: async () => (await api.get<RevenuePoint[]>('/reports/revenue/series')).data,
  });
}

export interface AppointmentPoint { date: string; booked: number; completed: number; noShow: number; }
export function useAppointmentSeries() {
  return useQuery({
    queryKey: ['appointment-series'],
    queryFn: async () => (await api.get<AppointmentPoint[]>('/reports/appointments/series')).data,
  });
}

export interface DiseaseStat { code: string; display: string; count: number; }
export function useDiseaseStats() {
  return useQuery({
    queryKey: ['disease-stats'],
    queryFn: async () => (await api.get<DiseaseStat[]>('/reports/diseases')).data,
  });
}
