import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServiceRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLabOrderDto, EnterResultsDto, QueryLabDto,
} from './dto/laboratory.dto';
import { canTransition, nextStates } from './lab-state';

const LOINC = 'http://loinc.org';

@Injectable()
export class LaboratoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Doctor orders a lab test — creates a LABORATORY ServiceRequest. */
  async createOrder(dto: CreateLabOrderDto) {
    return this.prisma.serviceRequest.create({
      data: {
        patientId: dto.patientId,
        requesterId: dto.requesterId,
        encounterId: dto.encounterId,
        category: 'LABORATORY',
        codeSystem: LOINC,
        code: dto.code,
        display: dto.display,
        status: 'REQUESTED',
        priority: dto.priority ?? 'ROUTINE',
      },
    });
  }

  /** The lab worklist — orders grouped by where they are in the pipeline. */
  async worklist(query: QueryLabDto) {
    const { page, limit, status, patientId } = query;
    const where: Prisma.ServiceRequestWhereInput = {
      category: 'LABORATORY',
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          requester: { select: { id: true, firstName: true, lastName: true } },
          report: { select: { id: true, status: true, issuedAt: true } },
        },
      }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Pipeline summary counts for the lab dashboard. */
  async pipelineSummary() {
    const rows = await this.prisma.serviceRequest.groupBy({
      by: ['status'],
      where: { category: 'LABORATORY' },
      _count: { _all: true },
    });
    const base: Record<ServiceRequestStatus, number> = {
      REQUESTED: 0, COLLECTED: 0, PROCESSING: 0, COMPLETED: 0, CANCELLED: 0,
    };
    for (const r of rows) base[r.status] = r._count._all;
    return base;
  }

  /** Advance an order (collect / process / cancel), stamping timestamps. */
  async advance(id: string, next: ServiceRequestStatus) {
    const order = await this.getOrder(id);
    if (next === 'COMPLETED') {
      throw new BadRequestException('Complete an order by entering results, not a status change');
    }
    if (!canTransition(order.status, next)) {
      throw new BadRequestException(
        `Cannot move from ${order.status} to ${next}. Allowed: ${nextStates(order.status).join(', ') || 'none'}`,
      );
    }
    const data: Prisma.ServiceRequestUpdateInput = { status: next };
    if (next === 'COLLECTED') data.collectedAt = new Date();
    return this.prisma.serviceRequest.update({ where: { id }, data });
  }

  /**
   * Enter results and complete the order. In one transaction this:
   *  1. derives abnormal flags from reference ranges (never trusts input),
   *  2. creates the DiagnosticReport,
   *  3. writes each result as an Observation linked to report + patient,
   *  4. marks the order COMPLETED,
   *  5. notifies the ordering doctor that results are ready.
   */
  async enterResults(id: string, dto: EnterResultsDto) {
    const order = await this.getOrder(id);
    if (order.status !== 'PROCESSING') {
      throw new BadRequestException('Results can only be entered while an order is PROCESSING');
    }
    if (order.report) {
      throw new BadRequestException('Results already entered for this order');
    }

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.diagnosticReport.create({
        data: {
          patientId: order.patientId,
          serviceRequestId: order.id,
          category: 'LABORATORY',
          status: 'FINAL',
          conclusion: dto.conclusion,
          issuedAt: new Date(),
        },
      });

      let anyAbnormal = false;
      for (const r of dto.results) {
        const isAbnormal = this.deriveAbnormal(r.valueNumber, r.referenceLow, r.referenceHigh);
        if (isAbnormal) anyAbnormal = true;
        await tx.observation.create({
          data: {
            patientId: order.patientId,
            encounterId: order.encounterId,
            reportId: report.id,
            category: 'LABORATORY',
            status: 'FINAL',
            codeSystem: LOINC,
            code: r.code,
            display: r.display,
            valueNumber: r.valueNumber,
            valueString: r.valueString,
            unit: r.unit,
            referenceLow: r.referenceLow,
            referenceHigh: r.referenceHigh,
            isAbnormal,
          },
        });
      }

      await tx.serviceRequest.update({
        where: { id: order.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Notify the ordering doctor (in-app). Look up their user account.
      const requester = await tx.practitioner.findUnique({
        where: { id: order.requesterId }, select: { userId: true },
      });
      if (requester?.userId) {
        await tx.notification.create({
          data: {
            userId: requester.userId,
            channel: 'IN_APP',
            title: 'Lab results ready',
            body: `${order.display} for patient completed${anyAbnormal ? ' — abnormal values flagged' : ''}.`,
            linkUrl: `/laboratory/${order.id}`,
          },
        });
      }

      return { report, resultCount: dto.results.length, anyAbnormal };
    });
  }

  /** Read a completed order with its report and result observations. */
  async findOne(id: string) {
    const order = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        requester: { select: { id: true, firstName: true, lastName: true } },
        report: { include: { observations: { orderBy: { display: 'asc' } } } },
      },
    });
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  // --- helpers ---------------------------------------------------------------

  /** Abnormal if a numeric value falls outside [low, high]. Qualitative → not flagged. */
  private deriveAbnormal(value?: number, low?: number, high?: number): boolean {
    if (value === undefined || value === null) return false;
    if (low !== undefined && value < low) return true;
    if (high !== undefined && value > high) return true;
    return false;
  }

  private async getOrder(id: string) {
    const order = await this.prisma.serviceRequest.findFirst({
      where: { id, category: 'LABORATORY' },
      include: { report: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }
}
