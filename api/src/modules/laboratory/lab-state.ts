import { ServiceRequestStatus } from '@prisma/client';

/**
 * Laboratory order lifecycle. A doctor's order enters REQUESTED; the lab
 * collects the specimen, processes it, and completes it (which produces the
 * DiagnosticReport). CANCELLED is reachable until results are entered.
 */
const TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  REQUESTED:  ['COLLECTED', 'CANCELLED'],
  COLLECTED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED:  [], // terminal — results are in
  CANCELLED:  [], // terminal
};

export function canTransition(from: ServiceRequestStatus, to: ServiceRequestStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStates(from: ServiceRequestStatus): ServiceRequestStatus[] {
  return TRANSITIONS[from] ?? [];
}
