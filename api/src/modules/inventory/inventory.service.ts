import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReceiveStockDto, AdjustStockDto, QueryInventoryDto } from './dto/inventory.dto';
import { isExpired, isNearExpiry } from './stock';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Medicine list with ledger-derived on-hand totals. On-hand is summed from
   * StockMovement deltas via groupBy — the authoritative source — not read from
   * a stored counter.
   */
  async list(query: QueryInventoryDto) {
    const { page, limit, search } = query;
    const where: Prisma.MedicineWhereInput = {
      deletedAt: null,
      ...(search
        ? { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { genericName: { contains: search, mode: 'insensitive' } },
          ] }
        : {}),
    };

    const [total, medicines] = await this.prisma.$transaction([
      this.prisma.medicine.count({ where }),
      this.prisma.medicine.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { name: 'asc' },
      }),
    ]);

    // Sum movement deltas per medicine in one query, then map.
    const grouped = await this.prisma.stockMovement.groupBy({
      by: ['medicineId'],
      where: { medicineId: { in: medicines.map((m) => m.id) } },
      _sum: { quantityDelta: true },
    });
    const onHandByMed = new Map(grouped.map((g) => [g.medicineId, g._sum.quantityDelta ?? 0]));

    const data = medicines.map((m) => {
      const onHand = onHandByMed.get(m.id) ?? 0;
      return {
        id: m.id, name: m.name, genericName: m.genericName, form: m.form,
        unitPrice: m.unitPrice, reorderLevel: m.reorderLevel,
        onHand,
        lowStock: onHand <= m.reorderLevel,
      };
    });

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** On-hand for one medicine, from the ledger. */
  async onHand(medicineId: string): Promise<number> {
    const agg = await this.prisma.stockMovement.aggregate({
      where: { medicineId }, _sum: { quantityDelta: true },
    });
    return agg._sum.quantityDelta ?? 0;
  }

  /**
   * Dashboard alerts: medicines at/under reorder level, and batches that are
   * expired or near expiry. This backs the "Inventory Alerts / Low Stock /
   * Expiry Alerts" cards.
   */
  async alerts() {
    const medicines = await this.prisma.medicine.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, reorderLevel: true },
    });
    const grouped = await this.prisma.stockMovement.groupBy({
      by: ['medicineId'], _sum: { quantityDelta: true },
    });
    const onHand = new Map(grouped.map((g) => [g.medicineId, g._sum.quantityDelta ?? 0]));

    const lowStock = medicines
      .map((m) => ({ id: m.id, name: m.name, onHand: onHand.get(m.id) ?? 0, reorderLevel: m.reorderLevel }))
      .filter((m) => m.onHand <= m.reorderLevel);

    const batches = await this.prisma.batch.findMany({
      where: { quantityOnHand: { gt: 0 } },
      include: { medicine: { select: { name: true } } },
    });
    const now = new Date();
    const expired = batches.filter((b) => isExpired(b, now))
      .map((b) => ({ batchId: b.id, medicine: b.medicine.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantityOnHand: b.quantityOnHand }));
    const nearExpiry = batches.filter((b) => isNearExpiry(b, 60, now))
      .map((b) => ({ batchId: b.id, medicine: b.medicine.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantityOnHand: b.quantityOnHand }));

    return {
      counts: { lowStock: lowStock.length, expired: expired.length, nearExpiry: nearExpiry.length },
      lowStock, expired, nearExpiry,
    };
  }

  /**
   * Receive stock: upsert the batch and write a PURCHASE_IN movement. The batch
   * snapshot and the ledger are updated together so both stay consistent.
   */
  async receive(dto: ReceiveStockDto) {
    const medicine = await this.prisma.medicine.findFirst({
      where: { id: dto.medicineId, deletedAt: null },
    });
    if (!medicine) throw new NotFoundException('Medicine not found');

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.upsert({
        where: { medicineId_batchNumber: { medicineId: dto.medicineId, batchNumber: dto.batchNumber } },
        create: {
          medicineId: dto.medicineId,
          batchNumber: dto.batchNumber,
          barcode: dto.barcode,
          expiryDate: new Date(dto.expiryDate),
          quantityOnHand: dto.quantity,
          costPrice: new Prisma.Decimal(dto.costPrice),
        },
        update: { quantityOnHand: { increment: dto.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          medicineId: dto.medicineId, batchId: batch.id,
          type: 'PURCHASE_IN', quantityDelta: dto.quantity, reason: 'Stock received',
        },
      });
      return batch;
    });
  }

  /** Manual adjustment (stock take, damage). Writes an ADJUSTMENT movement. */
  async adjust(dto: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.batchId) {
        await tx.batch.update({
          where: { id: dto.batchId },
          data: { quantityOnHand: { increment: dto.quantityDelta } },
        });
      }
      return tx.stockMovement.create({
        data: {
          medicineId: dto.medicineId, batchId: dto.batchId,
          type: 'ADJUSTMENT', quantityDelta: dto.quantityDelta, reason: dto.reason,
        },
      });
    });
  }
}
