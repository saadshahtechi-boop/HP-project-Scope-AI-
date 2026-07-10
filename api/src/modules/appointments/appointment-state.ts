import { AppointmentStatus } from '@prisma/client';

/**
 * Allowed appointment status transitions. Encoding this explicitly (rather than
 * letting any status be set to any other) is what keeps the scheduling workflow
 * honest: you cannot, say, complete an appointment that was never checked in.
 */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  BOOKED:     ['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED:  ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['COMPLETED', 'CANCELLED'],
  COMPLETED:  [], // terminal
  NO_SHOW:    [], // terminal
  CANCELLED:  [], // terminal
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertableNextStates(from: AppointmentStatus): AppointmentStatus[] {
  return TRANSITIONS[from] ?? [];
}
