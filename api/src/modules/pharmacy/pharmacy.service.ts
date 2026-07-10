import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DispenseDto, QueryQueueDto } from './dto/pharmacy.dto';
import { allocateFEFO } from '../inventory/stock';

@Injectable()
export class PharmacyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The dispensing queue: active prescriptions that map to a stocked medicine
   * and haven't been fully dispensed yet. This is what the pharmacist works from.
   */
  async queue(query: QueryQueueDto) {
    const { page, limit, patientId } = query;
    const where: Prisma.MedicationRequestWhereInput = {
      status: 'ACTIVE',
      deletedAt: null,
      medicineId: { not: null }, // only dispensable (stocked) items
      ...(patientId ? { patientId } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.medicationRequest.count({ where }),
      this.prisma.medicationRequest.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          prescriber: { select: { firstName: true, lastName: true } },
          medicine: { select: { id: true, name: true, form: true } },
          dispenseRecords: { select: { quantity: true } },
        },
      }),
    ]);

    // Annotate each with how much is still outstanding to dispense.
    const annotated = data.map((mr) => {
      const dispensed = mr.dispenseRecords.reduce((s, d) => s + d.quantity, 0);
      const requested = mr.quantity ?? 0;
      return { ...mr, dispensedQty: dispensed, outstandingQty: Math.max(requested - dispensed, 0) };
    });

    return { data: annotated, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Dispense against the stock ledger. FEFO picks the soonest-expiring batches;
   * each allocation writes a DispenseRecord and a negative DISPENSE_OUT movement,
   * and decrements the batch snapshot. All in one transaction so stock can never
   * be double-counted or left inconsistent.
   */
  async dispense(medicationRequestId: string, dto: DispenseDto) {
    const mr = await this.prisma.medicationRequest.findFirst({
      where: { id: medicationRequestId, deletedAt: null },
      include: { dispenseRecords: true },
    });
    if (!mr) throw new NotFoundException('Prescription not found');
    if (!mr.medicineId) throw new BadRequestException('This prescription has no stocked medicine to dispense');
    if (mr.status !== 'ACTIVE') throw new BadRequestException('Prescription is not active');

    const already = mr.dispenseRecords.reduce((s, d) => s + d.quantity, 0);
    const outstanding = (mr.quantity ?? 0) - already;
    const qty = dto.quantity ?? outstanding;
    if (qty <= 0) throw new BadRequestException('Nothing left to dispense');
    if (qty > outstanding) {
      throw new BadRequestException(`Cannot dispense ${qty}; only ${outstanding} remaining`);
    }

    // Load batches for FEFO allocation.
    const batches = await this.prisma.batch.findMany({
      where: { medicineId: mr.medicineId, quantityOnHand: { gt: 0 } },
    });

    let allocations;
    try {
      allocations = allocateFEFO(batches, qty);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const alloc of allocations) {
        await tx.dispenseRecord.create({
          data: {
            medicationRequestId: mr.id, batchId: alloc.batchId, quantity: alloc.quantity,
          },
        });
        await tx.stockMovement.create({
          data: {
            medicineId: mr.medicineId!, batchId: alloc.batchId,
            type: 'DISPENSE_OUT', quantityDelta: -alloc.quantity, reason: 'Dispensed to patient',
          },
        });
        await tx.batch.update({
          where: { id: alloc.batchId },
          data: { quantityOnHand: { decrement: alloc.quantity } },
        });
      }

      // Mark the prescription completed once fully dispensed.
      const totalDispensed = already + qty;
      if (totalDispensed >= (mr.quantity ?? 0)) {
        await tx.medicationRequest.update({
          where: { id: mr.id }, data: { status: 'COMPLETED' },
        });
      }

      return {
        dispensed: qty,
        fromBatches: allocations,
        fullyDispensed: totalDispensed >= (mr.quantity ?? 0),
      };
    });
  }
}
