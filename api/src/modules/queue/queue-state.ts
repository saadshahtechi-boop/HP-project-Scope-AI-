import { QueueStatus } from '@prisma/client';

/**
 * Queue ticket lifecycle. A ticket created at check-in starts WAITING; the
 * doctor calls it, consults, and completes it. SKIPPED handles no-shows in the
 * waiting room (patient stepped out) and can be re-called.
 */
const TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  WAITING:         ['CALLED', 'SKIPPED'],
  CALLED:          ['IN_CONSULTATION', 'SKIPPED', 'WAITING'],
  IN_CONSULTATION: ['DONE'],
  SKIPPED:         ['WAITING', 'CALLED'],
  DONE:            [], // terminal
};

export function canTransition(from: QueueStatus, to: QueueStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStates(from: QueueStatus): QueueStatus[] {
  return TRANSITIONS[from] ?? [];
}
