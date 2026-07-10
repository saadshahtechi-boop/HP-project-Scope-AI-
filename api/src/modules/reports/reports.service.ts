import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Period, rangeFor, dailyBuckets, dayLabel, startOfDay, endOfDay,
} from './date-range';

/**
 * Read-only analytics over the whole system. Every metric is a named method so
 * it can be reused: the dashboard/report controllers call these, and the AI
 * Assistant's natural-language analytics ("show revenue this month") will map
 * intents onto these same functions rather than re-implementing queries.
 *
 * Aggregation is pushed into the database (aggregate/groupBy) rather than
 * fetching rows and counting in JS.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** One-call dashboard summary — the live figures behind the top cards. */
  async dashboardSummary(now: Date = new Date()) {
    const today = { start: startOfDay(now), end: endOfDay(now) };

    const [
      todaysPatients, todaysAppointments, completedToday, waiting,
      revenueToday, pendingBills, availableDoctors,
    ] = await this.prisma.$transaction([
      // Distinct patients seen today = appointments checked in today
      this.prisma.appointment.count({
        where: { checkedInAt: { gte: today.start, lte: today.end } },
      }),
      this.prisma.appointment.count({
        where: { scheduledStart: { gte: today.start, lte: today.end }, deletedAt: null },
      }),
      this.prisma.encounter.count({
        where: { status: 'FINISHED', endedAt: { gte: today.start, lte: today.end } },
      }),
      this.prisma.queueTicket.count({
        where: { status: { in: ['WAITING', 'CALLED'] }, issuedAt: { gte: today.start, lte: today.end } },
      }),
      this.prisma.payment.aggregate({
        where: { paidAt: { gte: today.start, lte: today.end } }, _sum: { amount: true },
      }),
      this.prisma.invoice.count({
        where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, deletedAt: null },
      }),
      this.prisma.practitioner.count({ where: { role: 'DOCTOR', deletedAt: null } }),
    ]);

    return {
      todaysPatients,
      todaysAppointments,
      completedConsultations: completedToday,
      waitingPatients: waiting,
      todaysRevenue: Number(revenueToday._sum.amount ?? 0),
      pendingBills,
      doctorsAvailable: availableDoctors,
    };
  }

  /** Daily revenue for the last N days — the revenue graph series. */
  async revenueSeries(days = 7, now: Date = new Date()) {
    const buckets = dailyBuckets(days, now);
    // One query for the whole window, then bucket in memory (cheaper than N queries).
    const payments = await this.prisma.payment.findMany({
      where: { paidAt: { gte: buckets[0].start, lte: buckets[buckets.length - 1].end } },
      select: { amount: true, paidAt: true },
    });
    return buckets.map((b) => {
      const total = payments
        .filter((p) => p.paidAt >= b.start && p.paidAt <= b.end)
        .reduce((s, p) => s + Number(p.amount), 0);
      return { date: dayLabel(b.start), revenue: total };
    });
  }

  /** Total revenue in a named period. */
  async revenueForPeriod(period: Period, now: Date = new Date()) {
    const { start, end } = rangeFor(period, now);
    const agg = await this.prisma.payment.aggregate({
      where: { paidAt: { gte: start, lte: end } }, _sum: { amount: true }, _count: { _all: true },
    });
    return { period, revenue: Number(agg._sum.amount ?? 0), payments: agg._count._all };
  }

  /** Booked vs completed appointments per day — the appointments graph. */
  async appointmentSeries(days = 7, now: Date = new Date()) {
    const buckets = dailyBuckets(days, now);
    const appts = await this.prisma.appointment.findMany({
      where: { scheduledStart: { gte: buckets[0].start, lte: buckets[buckets.length - 1].end }, deletedAt: null },
      select: { scheduledStart: true, status: true },
    });
    return buckets.map((b) => {
      const inDay = appts.filter((a) => a.scheduledStart >= b.start && a.scheduledStart <= b.end);
      return {
        date: dayLabel(b.start),
        booked: inDay.length,
        completed: inDay.filter((a) => a.status === 'COMPLETED').length,
        noShow: inDay.filter((a) => a.status === 'NO_SHOW').length,
      };
    });
  }

  /** Disease statistics — top diagnoses by frequency (ICD-10). */
  async diseaseStats(limit = 8) {
    const grouped = await this.prisma.condition.groupBy({
      by: ['code', 'display'],
      where: { deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { code: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({ code: g.code, display: g.display, count: g._count._all }));
  }

  /** Doctor performance — consultations completed and revenue generated. */
  async doctorPerformance(period: Period = 'month', now: Date = new Date()) {
    const { start, end } = rangeFor(period, now);
    const grouped = await this.prisma.encounter.groupBy({
      by: ['practitionerId'],
      where: { status: 'FINISHED', endedAt: { gte: start, lte: end } },
      _count: { _all: true },
      orderBy: { _count: { practitionerId: 'desc' } },
      take: 25,
    });
    // Hydrate practitioner names.
    const ids = grouped.map((g) => g.practitionerId);
    const docs = await this.prisma.practitioner.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, specialty: true },
    });
    const byId = new Map(docs.map((d) => [d.id, d]));
    return grouped.map((g) => {
      const d = byId.get(g.practitionerId);
      return {
        practitionerId: g.practitionerId,
        name: d ? `Dr. ${d.firstName} ${d.lastName}` : 'Unknown',
        specialty: d?.specialty ?? null,
        consultations: g._count._all,
      };
    });
  }

  /** Patient growth — new registrations per day over the window. */
  async patientGrowth(days = 30, now: Date = new Date()) {
    const buckets = dailyBuckets(days, now);
    const patients = await this.prisma.patient.findMany({
      where: { createdAt: { gte: buckets[0].start, lte: buckets[buckets.length - 1].end } },
      select: { createdAt: true },
    });
    let cumulative = await this.prisma.patient.count({
      where: { createdAt: { lt: buckets[0].start } },
    });
    return buckets.map((b) => {
      const added = patients.filter((p) => p.createdAt >= b.start && p.createdAt <= b.end).length;
      cumulative += added;
      return { date: dayLabel(b.start), newPatients: added, total: cumulative };
    });
  }

  /** Patients who missed appointments (NO_SHOW) in a period — used by AI analytics too. */
  async missedAppointments(period: Period = 'month', now: Date = new Date()) {
    const { start, end } = rangeFor(period, now);
    const rows = await this.prisma.appointment.findMany({
      where: { status: 'NO_SHOW', scheduledStart: { gte: start, lte: end }, deletedAt: null },
      include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true, phone: true } } },
      orderBy: { scheduledStart: 'desc' },
      take: 100,
    });
    return rows.map((a) => ({
      appointmentId: a.id,
      scheduledStart: a.scheduledStart,
      patient: a.patient,
    }));
  }
}
