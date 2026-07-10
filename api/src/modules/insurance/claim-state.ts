import { ClaimStatus } from '@prisma/client';

/**
 * Insurance claim lifecycle. A claim is drafted against an invoice, submitted to
 * the payer, reviewed, then resolved (approved / partially / denied) and finally
 * paid. Encoding transitions keeps the workflow honest — you can't pay a denied
 * claim or resolve one that was never submitted.
 */
const TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  DRAFT:              ['SUBMITTED'],
  SUBMITTED:          ['IN_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED'],
  IN_REVIEW:          ['APPROVED', 'PARTIALLY_APPROVED', 'DENIED'],
  APPROVED:           ['PAID'],
  PARTIALLY_APPROVED: ['PAID'],
  DENIED:             [], // terminal
  PAID:               [], // terminal
};

export function canTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStates(from: ClaimStatus): ClaimStatus[] {
  return TRANSITIONS[from] ?? [];
}
