/**
 * Stock is a derived quantity, never a stored mutable counter.
 *
 * On-hand for a medicine (or batch) is the SUM of its StockMovement deltas:
 * PURCHASE_IN and RETURN are positive; DISPENSE_OUT, ADJUSTMENT (when negative),
 * and EXPIRY_WRITE_OFF are negative. This guarantees the number always
 * reconciles with the movement history — you can audit exactly how it got there.
 *
 * These helpers are pure so they can be unit-tested without a database.
 */

export interface MovementLike {
  quantityDelta: number;
}

export interface BatchLike {
  id: string;
  expiryDate: Date | string;
  quantityOnHand: number; // snapshot; authoritative value still derives from ledger
}

/** On-hand = Σ deltas. */
export function stockOnHand(movements: MovementLike[]): number {
  return movements.reduce((sum, m) => sum + m.quantityDelta, 0);
}

/** True when the batch expires on/before `asOf` (default now). */
export function isExpired(batch: BatchLike, asOf: Date = new Date()): boolean {
  return new Date(batch.expiryDate).getTime() <= asOf.getTime();
}

/** True when the batch expires within `days` of `asOf` (and isn't already expired). */
export function isNearExpiry(batch: BatchLike, days = 60, asOf: Date = new Date()): boolean {
  const expiry = new Date(batch.expiryDate).getTime();
  const horizon = asOf.getTime() + days * 24 * 60 * 60 * 1000;
  return expiry > asOf.getTime() && expiry <= horizon;
}

/**
 * FEFO allocation — First Expiry, First Out. Given batches with on-hand
 * quantities and a quantity to dispense, returns which batches to draw from and
 * how much from each, soonest-expiring first, skipping expired stock.
 * Throws if there isn't enough non-expired stock to fulfil the request.
 */
export interface Allocation {
  batchId: string;
  quantity: number;
}

export function allocateFEFO(
  batches: BatchLike[],
  quantity: number,
  asOf: Date = new Date(),
): Allocation[] {
  if (quantity <= 0) throw new Error('Quantity to dispense must be positive');

  const usable = batches
    .filter((b) => b.quantityOnHand > 0 && !isExpired(b, asOf))
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const totalAvailable = usable.reduce((s, b) => s + b.quantityOnHand, 0);
  if (totalAvailable < quantity) {
    throw new Error(`Insufficient stock: need ${quantity}, have ${totalAvailable} available`);
  }

  const allocations: Allocation[] = [];
  let remaining = quantity;
  for (const batch of usable) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityOnHand, remaining);
    allocations.push({ batchId: batch.id, quantity: take });
    remaining -= take;
  }
  return allocations;
}
