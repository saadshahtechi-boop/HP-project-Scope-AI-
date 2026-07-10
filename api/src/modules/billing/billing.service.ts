import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInvoiceDto, RecordPaymentDto, RefundDto, QueryInvoicesDto,
} from './dto/billing.dto';
import { computeTotals, deriveStatus, toCents } from './money';

const CONSULTATION_FEE = 50; // flat demo consult fee; would come from a fee schedule

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create an invoice from explicit line items. */
  async create(dto: CreateInvoiceDto) {
    const totals = computeTotals(dto.lineItems, dto.discount ?? 0, dto.taxRate ?? 0);
    const number = await this.nextInvoiceNumber();

    return this.prisma.invoice.create({
      data: {
        number,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        status: 'ISSUED',
        subtotal: new Prisma.Decimal(totals.subtotal),
        discount: new Prisma.Decimal(totals.discount),
        tax: new Prisma.Decimal(totals.tax),
        total: new Prisma.Decimal(totals.total),
        amountPaid: new Prisma.Decimal(0),
        issuedAt: new Date(),
        lineItems: {
          create: dto.lineItems.map((li) => ({
            category: li.category,
            description: li.description,
            quantity: li.quantity,
            unitPrice: new Prisma.Decimal(li.unitPrice),
            lineTotal: new Prisma.Decimal(li.quantity * li.unitPrice),
          })),
        },
      },
      include: { lineItems: true },
    });
  }

  /**
   * Generate an invoice directly from a completed encounter: consultation fee +
   * one line per prescription + one line per lab order. This is the visit →
   * billing step of the workflow, called after a consultation completes.
   */
  async createFromEncounter(encounterId: string, taxRate = 0.05) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: { select: { id: true } },
        medicationRequests: { where: { deletedAt: null }, include: { medicine: true } },
        serviceRequests: true,
        invoice: true,
      },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');
    if (encounter.invoice) {
      throw new BadRequestException('An invoice already exists for this encounter');
    }

    const lineItems: CreateInvoiceDto['lineItems'] = [
      { category: 'CONSULTATION', description: 'Consultation fee', quantity: 1, unitPrice: CONSULTATION_FEE },
    ];

    for (const mr of encounter.medicationRequests) {
      const unit = mr.medicine ? Number(mr.medicine.unitPrice) : 5;
      lineItems.push({
        category: 'MEDICATION',
        description: mr.medicationDisplay,
        quantity: mr.quantity ?? 1,
        unitPrice: unit,
      });
    }

    for (const sr of encounter.serviceRequests) {
      lineItems.push({
        category: sr.category === 'RADIOLOGY' ? 'RADIOLOGY' : 'LABORATORY',
        description: sr.display,
        quantity: 1,
        unitPrice: sr.category === 'RADIOLOGY' ? 40 : 20, // demo pricing
      });
    }

    return this.create({ patientId: encounter.patientId, encounterId, lineItems, taxRate });
  }

  async findMany(query: QueryInvoicesDto) {
    const { page, limit, patientId, status } = query;
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(patientId ? { patientId } : {}),
      ...(status ? { status } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        },
      }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        lineItems: true,
        payments: { orderBy: { paidAt: 'desc' } },
        refunds: { orderBy: { refundedAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  /**
   * Record a payment. Rejects overpayment, then recomputes amountPaid and
   * derives status — status is never set directly. Wrapped so the payment row
   * and the invoice update commit together.
   */
  async recordPayment(id: string, dto: RecordPaymentDto) {
    const invoice = await this.findOne(id);
    if (invoice.status === 'VOID' || invoice.status === 'REFUNDED') {
      throw new BadRequestException(`Cannot pay a ${invoice.status.toLowerCase()} invoice`);
    }

    const totalC = toCents(Number(invoice.total));
    const paidC = toCents(Number(invoice.amountPaid));
    const newPaidC = paidC + toCents(dto.amount);
    if (newPaidC > totalC) {
      const remaining = (totalC - paidC) / 100;
      throw new BadRequestException(`Payment exceeds balance. Outstanding: ${remaining.toFixed(2)}`);
    }

    const status = deriveStatus(totalC, newPaidC);

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          invoiceId: id,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          reference: dto.reference,
        },
      });
      return tx.invoice.update({
        where: { id },
        data: { amountPaid: new Prisma.Decimal(newPaidC / 100), status },
        include: { payments: true },
      });
    });
  }

  /** Refund up to the amount paid; marks the invoice REFUNDED. */
  async refund(id: string, dto: RefundDto) {
    const invoice = await this.findOne(id);
    const paidC = toCents(Number(invoice.amountPaid));
    if (toCents(dto.amount) > paidC) {
      throw new BadRequestException('Refund exceeds amount paid');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: { invoiceId: id, amount: new Prisma.Decimal(dto.amount), reason: dto.reason },
      });
      const newPaidC = paidC - toCents(dto.amount);
      return tx.invoice.update({
        where: { id },
        data: {
          amountPaid: new Prisma.Decimal(newPaidC / 100),
          status: newPaidC <= 0 ? 'REFUNDED' : 'PARTIALLY_PAID',
        },
      });
    });
  }

  /** Aggregate outstanding balance across issued/partial invoices. */
  async outstanding(patientId?: string) {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      ...(patientId ? { patientId } : {}),
    };
    const invoices = await this.prisma.invoice.findMany({
      where, select: { total: true, amountPaid: true },
    });
    const outstandingC = invoices.reduce(
      (sum, i) => sum + (toCents(Number(i.total)) - toCents(Number(i.amountPaid))), 0,
    );
    return { count: invoices.length, outstanding: outstandingC / 100 };
  }

  // --- helpers ---------------------------------------------------------------

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count();
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
