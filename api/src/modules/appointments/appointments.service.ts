import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, AppointmentStatus, QueuePriority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAppointmentDto, RescheduleAppointmentDto, QueryAppointmentsDto,
} from './dto/appointment.dto';
import { canTransition, assertableNextStates } from './appointment-state';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active doctors, for the booking form's practitioner picker. */
  async listPractitioners() {
    return this.prisma.practitioner.findMany({
      where: { role: 'DOCTOR', deletedAt: null },
      select: { id: true, firstName: true, lastName: true, specialty: true },
      orderBy: { lastName: 'asc' },
    });
  }

  /** Book an appointment, rejecting slots that overlap the doctor's existing ones. */
  async create(dto: CreateAppointmentDto) {
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (end <= start) {
      throw new BadRequestException('scheduledEnd must be after scheduledStart');
    }

    await this.assertNoConflict(dto.practitionerId, start, end);

    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        scheduledStart: start,
        scheduledEnd: end,
        reason: dto.reason,
        status: AppointmentStatus.BOOKED,
      },
    });
  }

  async findMany(query: QueryAppointmentsDto) {
    const { page, limit, practitionerId, patientId, status, date } = query;

    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      ...(practitionerId ? { practitionerId } : {}),
      ...(patientId ? { patientId } : {}),
      ...(status ? { status } : {}),
      ...(date ? this.dayRange(date) : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledStart: 'asc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          practitioner: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        },
      }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: true,
        practitioner: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        queueTicket: true,
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto) {
    const appt = await this.findOne(id);
    if (appt.status !== 'BOOKED' && appt.status !== 'CONFIRMED') {
      throw new BadRequestException('Only booked or confirmed appointments can be rescheduled');
    }
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (end <= start) throw new BadRequestException('scheduledEnd must be after scheduledStart');

    await this.assertNoConflict(appt.practitionerId, start, end, id);

    return this.prisma.appointment.update({
      where: { id },
      data: { scheduledStart: start, scheduledEnd: end },
    });
  }

  /** Guarded status change for confirm / cancel / no-show. */
  async changeStatus(id: string, next: AppointmentStatus) {
    const appt = await this.findOne(id);
    if (!canTransition(appt.status, next)) {
      throw new BadRequestException(
        `Cannot move appointment from ${appt.status} to ${next}. ` +
          `Allowed: ${assertableNextStates(appt.status).join(', ') || 'none (terminal state)'}`,
      );
    }
    // Check-in is handled by its own endpoint because it has side effects.
    if (next === 'CHECKED_IN') {
      throw new BadRequestException('Use the check-in endpoint to check a patient in');
    }
    return this.prisma.appointment.update({ where: { id }, data: { status: next } });
  }

  /**
   * Check-in: the pivotal transition. Atomically flips the appointment to
   * CHECKED_IN and creates the QueueTicket with the next token number and an
   * estimated wait. Wrapped in a transaction so we never get a checked-in
   * appointment without its ticket (or vice versa).
   */
  async checkIn(id: string, priority: QueuePriority = 'NORMAL') {
    const appt = await this.findOne(id);
    if (!canTransition(appt.status, 'CHECKED_IN')) {
      throw new BadRequestException(`Cannot check in from status ${appt.status}`);
    }
    if (appt.queueTicket) {
      throw new ConflictException('Patient already checked in');
    }

    const token = await this.nextToken();
    const estimatedWaitMins = await this.estimateWait(appt.practitionerId, priority);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: 'CHECKED_IN', checkedInAt: new Date() },
      });
      const ticket = await tx.queueTicket.create({
        data: {
          appointmentId: id,
          patientId: appt.patientId,
          practitionerId: appt.practitionerId,
          tokenNumber: token,
          priority,
          status: 'WAITING',
          estimatedWaitMins,
        },
      });
      return { appointment: updated, queueTicket: ticket };
    });
  }

  // --- helpers ---------------------------------------------------------------

  /** Reject overlapping bookings for the same practitioner (excluding self on reschedule). */
  private async assertNoConflict(
    practitionerId: string, start: Date, end: Date, excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        practitionerId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        // Overlap test: existing.start < new.end AND existing.end > new.start
        scheduledStart: { lt: end },
        scheduledEnd: { gt: start },
      },
      select: { id: true, scheduledStart: true },
    });
    if (conflict) {
      throw new ConflictException('This time slot overlaps another appointment for this doctor');
    }
  }

  /** Next global token number for today (resets daily). */
  private async nextToken(): Promise<number> {
    const { start, end } = this.todayBounds();
    const count = await this.prisma.queueTicket.count({
      where: { issuedAt: { gte: start, lte: end } },
    });
    return count + 1;
  }

  /**
   * Estimated wait = (people ahead in the same/higher priority lane) ×
   * rolling average consult duration for that doctor. Emergencies wait ~0.
   */
  private async estimateWait(practitionerId: string, priority: QueuePriority): Promise<number> {
    if (priority === 'EMERGENCY') return 0;

    const ahead = await this.prisma.queueTicket.count({
      where: {
        practitionerId,
        status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
        ...(priority === 'NORMAL' ? {} : { priority: { in: ['PRIORITY', 'EMERGENCY'] } }),
      },
    });

    const AVG_CONSULT_MINS = 15; // could be derived from historical encounter durations
    return ahead * AVG_CONSULT_MINS;
  }

  private dayRange(date: string): Prisma.AppointmentWhereInput {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { scheduledStart: { gte: start, lte: end } };
  }

  private todayBounds(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}
