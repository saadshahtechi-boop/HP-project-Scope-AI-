import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { RXNORM_SYSTEM } from './patients.constants';

/** A single item in the unified clinical timeline. */
export interface TimelineEvent {
  type: 'ENCOUNTER' | 'DIAGNOSIS' | 'OBSERVATION' | 'PRESCRIPTION' | 'LAB_ORDER' | 'PROCEDURE';
  date: Date;
  title: string;
  detail?: string;
  encounterId?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a patient plus any nested contact/insurance/allergy/history records. */
  async create(dto: CreatePatientDto) {
    const mrn = await this.generateMrn();

    return this.prisma.patient.create({
      data: {
        mrn,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        bloodGroup: dto.bloodGroup ?? 'UNKNOWN',
        phone: dto.phone,
        email: dto.email,
        addressLine: dto.addressLine,
        city: dto.city,
        country: dto.country,
        emergencyContacts: dto.emergencyContact
          ? { create: dto.emergencyContact }
          : undefined,
        insurancePolicies: dto.insurance
          ? { create: { ...dto.insurance, isPrimary: true } }
          : undefined,
        allergies: dto.allergies?.length
          ? {
              create: dto.allergies.map((a) => ({
                substanceSystem: RXNORM_SYSTEM,
                substanceCode: a.substanceCode,
                substanceDisplay: a.substanceDisplay,
                reaction: a.reaction,
                criticality: a.criticality ?? 'UNABLE_TO_ASSESS',
                severity: a.severity,
              })),
            }
          : undefined,
        histories: dto.histories?.length
          ? { create: dto.histories }
          : undefined,
      },
      include: { emergencyContacts: true, insurancePolicies: true, allergies: true },
    });
  }

  /** Paginated list with free-text search across name, MRN, and phone. */
  async findMany(query: QueryPatientsDto) {
    const { page, limit, search } = query;

    const where: Prisma.PatientWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { mrn: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, mrn: true, firstName: true, lastName: true,
          gender: true, dateOfBirth: true, bloodGroup: true, phone: true, createdAt: true,
        },
      }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Full patient profile with all satellite records. */
  async findOne(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        emergencyContacts: true,
        insurancePolicies: true,
        allergies: { where: { deletedAt: null } },
        histories: { orderBy: { notedAt: 'desc' } },
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    await this.assertExists(id);
    return this.prisma.patient.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        bloodGroup: dto.bloodGroup,
        phone: dto.phone,
        email: dto.email,
        addressLine: dto.addressLine,
        city: dto.city,
        country: dto.country,
      },
    });
  }

  /** Soft delete — preserves clinical history for audit. */
  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  /**
   * Builds the unified EMR timeline: pulls encounters, diagnoses, observations,
   * prescriptions, and lab orders, then merges them into one stream ordered
   * newest-first. This backs the clinical-timeline screen.
   */
  async getTimeline(id: string): Promise<TimelineEvent[]> {
    await this.assertExists(id);

    const [encounters, conditions, observations, prescriptions, orders, procedures] =
      await this.prisma.$transaction([
        this.prisma.encounter.findMany({
          where: { patientId: id, deletedAt: null },
          include: { practitioner: { select: { firstName: true, lastName: true, specialty: true } }, soapNote: true },
        }),
        this.prisma.condition.findMany({ where: { patientId: id, deletedAt: null } }),
        this.prisma.observation.findMany({
          where: { patientId: id },
          orderBy: { effectiveAt: 'desc' },
          take: 200, // cap: vitals can be numerous; timeline shows recent
        }),
        this.prisma.medicationRequest.findMany({ where: { patientId: id, deletedAt: null } }),
        this.prisma.serviceRequest.findMany({ where: { patientId: id } }),
        this.prisma.procedure.findMany({ where: { patientId: id } }),
      ]);

    const events: TimelineEvent[] = [];

    for (const e of encounters) {
      events.push({
        type: 'ENCOUNTER',
        date: e.startedAt,
        title: `Consultation — Dr. ${e.practitioner.lastName}`,
        detail: e.practitioner.specialty ?? undefined,
        encounterId: e.id,
        meta: { assessment: e.soapNote?.assessment },
      });
    }
    for (const c of conditions) {
      events.push({
        type: 'DIAGNOSIS',
        date: c.recordedAt,
        title: c.display,
        detail: `${c.code} · ${c.clinicalStatus}`,
        encounterId: c.encounterId ?? undefined,
      });
    }
    for (const o of observations) {
      events.push({
        type: 'OBSERVATION',
        date: o.effectiveAt,
        title: `${o.display}: ${o.valueNumber ?? o.valueString ?? ''}${o.unit ? ' ' + o.unit : ''}`,
        detail: o.isAbnormal ? 'Abnormal' : 'Normal',
        encounterId: o.encounterId ?? undefined,
        meta: { category: o.category, abnormal: o.isAbnormal },
      });
    }
    for (const p of prescriptions) {
      events.push({
        type: 'PRESCRIPTION',
        date: p.createdAt,
        title: p.medicationDisplay,
        detail: `${p.dosage} · ${p.frequency}`,
        encounterId: p.encounterId ?? undefined,
      });
    }
    for (const s of orders) {
      events.push({
        type: 'LAB_ORDER',
        date: s.createdAt,
        title: `${s.category}: ${s.display}`,
        detail: s.status,
        encounterId: s.encounterId ?? undefined,
      });
    }
    for (const pr of procedures) {
      events.push({
        type: 'PROCEDURE',
        date: pr.performedAt,
        title: pr.display,
        detail: pr.code,
        encounterId: pr.encounterId ?? undefined,
      });
    }

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // --- helpers ---------------------------------------------------------------

  private async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null }, select: { id: true },
    });
    if (!exists) throw new NotFoundException('Patient not found');
  }

  /**
   * Sequential MRN: MRN-1000xx. Derived from current count; in a high-concurrency
   * production system this would move to a dedicated sequence, but it is safe
   * and readable for the clinic's scale.
   */
  private async generateMrn(): Promise<string> {
    const count = await this.prisma.patient.count();
    return `MRN-${100000 + count + 1}`;
  }
}
