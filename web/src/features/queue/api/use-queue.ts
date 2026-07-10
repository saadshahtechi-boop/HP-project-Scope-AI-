import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

/** Matches QueueService.getBoard() output. */
export interface QueueTicket {
  id: string;
  tokenNumber: number;
  priority?: 'NORMAL' | 'PRIORITY' | 'EMERGENCY';
  estimatedWaitMins?: number | null;
  room?: string | null;
  patient: { id: string; firstName: string; lastName: string; mrn: string };
  practitioner: { id?: string; firstName?: string; lastName: string } | null;
}

export interface QueueBoard {
  summary: { waiting: number; inConsultation: number; completed: number; emergency: number };
  lanes: { emergency: QueueTicket[]; priority: QueueTicket[]; normal: QueueTicket[] };
  inConsultation: QueueTicket[];
  completed: QueueTicket[];
}

/**
 * Polls the live board every 10s so tokens advance without a manual refresh —
 * the queue is the one screen where near-real-time actually matters.
 */
export function useQueueBoard() {
  return useQuery({
    queryKey: ['queue-board'],
    queryFn: async () => (await api.get<QueueBoard>('/queue/board')).data,
    refetchInterval: 10_000,
  });
}
