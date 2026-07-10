import { InvoiceStatus } from '@prisma/client';

/**
 * Money is computed in integer cents internally to avoid floating-point drift
 * (0.1 + 0.2 !== 0.3), then surfaced as fixed-2 decimals. All invoice totals
 * flow through here so the arithmetic lives in exactly one place.
 */

export const toCents = (n: number): number => Math.round(n * 100);
export const fromCents = (c: number): number => c / 100;

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/** subtotal = Σ(qty × unitPrice); tax applied to (subtotal − discount). */
export function computeTotals(
  lineItems: { quantity: number; unitPrice: number }[],
  discount = 0,
  taxRate = 0,
): InvoiceTotals {
  const subtotalC = lineItems.reduce(
    (sum, li) => sum + li.quantity * toCents(li.unitPrice), 0,
  );
  const discountC = Math.min(toCents(discount), subtotalC); // never exceed subtotal
  const taxableC = subtotalC - discountC;
  const taxC = Math.round(taxableC * taxRate);
  const totalC = taxableC + taxC;

  return {
    subtotal: fromCents(subtotalC),
    discount: fromCents(discountC),
    tax: fromCents(taxC),
    total: fromCents(totalC),
  };
}

/** Status is derived from money, never set by hand. */
export function deriveStatus(totalC: number, paidC: number): InvoiceStatus {
  if (paidC <= 0) return 'ISSUED';
  if (paidC >= totalC) return 'PAID';
  return 'PARTIALLY_PAID';
}
