import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueueStatus, QueuePriority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { canTransition, nextStates } from './queue-state';

const AVG_CONSULT_MINS = 15;

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The live queue board: active tickets for today, split into priority lanes
   * plus the currently in-consultation patient per doctor. This is what the
   * reception and doctor dashboards poll.
   */
  async getBoard(practitionerId?: string) {
    const { start, end } = this.todayBounds();
    const tickets = await this.prisma.queueTicket.findMany({
      where: {
        issuedAt: { gte: start, lte: end },
        ...(practitionerId ? { practitionerId } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
      },
      // Emergency first, then priority, then normal; within a lane, by token.
      orderBy: [{ priority: 'desc' }, { tokenNumber: 'asc' }],
    });

    const waiting = tickets.filter((t) => t.status === 'WAITING' || t.status === 'CALLED');
    const inConsultation = tickets.filter((t) => t.status === 'IN_CONSULTATION');
    const completed = tickets.filter((t) => t.status === 'DONE');

    return {
      summary: {
        waiting: waiting.length,
        inConsultation: inConsultation.length,
        completed: completed.length,
        emergency: waiting.filter((t) => t.priority === 'EMERGENCY').length,
      },
      lanes: {
        emergency: waiting.filter((t) => t.priority === 'EMERGENCY'),
        priority: waiting.filter((t) => t.priority === 'PRIORITY'),
        normal: waiting.filter((t) => t.priority === 'NORMAL'),
      },
      inConsultation,
      completed,
    };
  }

  /** Guarded ticket transition; stamps timestamps and recomputes waits. */
  async transition(id: string, next: QueueStatus) {
    const ticket = await this.prisma.queueTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Queue ticket not found');

    if (!canTransition(ticket.status, next)) {
      throw new BadRequestException(
        `Cannot move ticket from ${ticket.status} to ${next}. ` +
          `Allowed: ${nextStates(ticket.status).join(', ') || 'none (terminal)'}`,
      );
    }

    const data: Record<string, unknown> = { status: next };
    if (next === 'CALLED') data.calledAt = new Date();
    if (next === 'DONE') data.completedAt = new Date();

    const updated = await this.prisma.queueTicket.update({ where: { id }, data });

    // When someone finishes or is called, everyone behind them moves up.
    if ((next === 'DONE' || next === 'CALLED') && ticket.practitionerId) {
      await this.recomputeWaits(ticket.practitionerId);
    }
    return updated;
  }

  /** Convenience: call the next waiting patient for a doctor (respects lanes). */
  async callNext(practitionerId: string) {
    const nextTicket = await this.prisma.queueTicket.findFirst({
      where: { practitionerId, status: 'WAITING' },
      orderBy: [{ priority: 'desc' }, { tokenNumber: 'asc' }],
    });
    if (!nextTicket) throw new NotFoundException('No patients waiting');
    return this.transition(nextTicket.id, 'CALLED');
  }

  /**
   * Recompute estimated waits for a doctor's waiting lane: each ticket's wait is
   * its position among those ahead (priority-weighted) × average consult time.
   */
  private async recomputeWaits(practitionerId: string): Promise<void> {
    const waiting = await this.prisma.queueTicket.findMany({
      where: { practitionerId, status: { in: ['WAITING', 'CALLED'] } },
      orderBy: [{ priority: 'desc' }, { tokenNumber: 'asc' }],
      select: { id: true },
    });
    await this.prisma.$transaction(
      waiting.map((t, index) =>
        this.prisma.queueTicket.update({
          where: { id: t.id },
          data: { estimatedWaitMins: index * AVG_CONSULT_MINS },
        }),
      ),
    );
  }

  private todayBounds(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}
