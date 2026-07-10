import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import {
  Prisma, ObservationCategory, ConditionClinicalStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StartConsultationDto, SoapNoteDto, CompleteConsultationDto,
} from './dto/consultation.dto';

const LOINC = 'http://loinc.org';
const ICD10 = 'http://hl7.org/fhir/sid/icd-10-cm';
const RXNORM = 'http://www.nlm.nih.gov/research/umls/rxnorm';

@Injectable()
export class ConsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Open an encounter when the doctor calls the patient in. */
  async start(dto: StartConsultationDto) {
    // Guard against opening a second active encounter for the same appointment.
    if (dto.appointmentId) {
      const existing = await this.prisma.encounter.findUnique({
        where: { appointmentId: dto.appointmentId },
      });
      if (existing) return existing; // idempotent: reuse the open encounter
    }

    return this.prisma.encounter.create({
      data: {
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        appointmentId: dto.appointmentId,
        class: 'AMBULATORY',
        status: 'IN_PROGRESS',
      },
    });
  }

  /**
   * Everything the consultation workspace needs on open: patient identity,
   * allergies, current meds, recent labs/vitals, and history — one call so the
   * screen renders without a waterfall of requests.
   */
  async getWorkspace(encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: {
          include: {
            allergies: { where: { deletedAt: null } },
            histories: { orderBy: { notedAt: 'desc' } },
          },
        },
        practitioner: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        soapNote: true,
      },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');

    const patientId = encounter.patientId;
    const [currentMeds, recentLabs, recentVitals] = await this.prisma.$transaction([
      this.prisma.medicationRequest.findMany({
        where: { patientId, status: 'ACTIVE', deletedAt: null },
        orderBy: { createdAt: 'desc' }, take: 10,
      }),
      this.prisma.observation.findMany({
        where: { patientId, category: 'LABORATORY' },
        orderBy: { effectiveAt: 'desc' }, take: 10,
      }),
      this.prisma.observation.findMany({
        where: { patientId, category: 'VITAL_SIGNS' },
        orderBy: { effectiveAt: 'desc' }, take: 10,
      }),
    ]);

    return { encounter, currentMeds, recentLabs, recentVitals };
  }

  /** Save/patch the SOAP note during the visit (upsert, one per encounter). */
  async saveSoap(encounterId: string, dto: SoapNoteDto) {
    await this.assertEncounterOpen(encounterId);
    return this.prisma.soapNote.upsert({
      where: { encounterId },
      create: { encounterId, ...dto },
      update: { ...dto },
    });
  }

  /**
   * Complete the visit. This is the transactional core: the SOAP note, every
   * observation, every diagnosis, and every prescription are written together
   * with the encounter close and queue-ticket completion. If any part fails,
   * the whole visit rolls back — we never persist half a clinical record.
   */
  async complete(encounterId: string, dto: CompleteConsultationDto) {
    const encounter = await this.assertEncounterOpen(encounterId);
    const { patientId, practitionerId } = encounter;

    return this.prisma.$transaction(async (tx) => {
      // 1. SOAP note (upsert)
      await tx.soapNote.upsert({
        where: { encounterId },
        create: { encounterId, ...dto.soap },
        update: { ...dto.soap },
      });

      // 2. Observations (vitals recorded this visit)
      if (dto.observations?.length) {
        await tx.observation.createMany({
          data: dto.observations.map((o) => ({
            patientId, encounterId, performerId: practitionerId,
            category: o.category ?? ObservationCategory.VITAL_SIGNS,
            status: 'FINAL',
            codeSystem: LOINC, code: o.code, display: o.display,
            valueNumber: o.valueNumber, valueString: o.valueString, unit: o.unit,
            referenceLow: o.referenceLow, referenceHigh: o.referenceHigh,
            isAbnormal: o.isAbnormal,
          })),
        });
      }

      // 3. Diagnoses (Conditions)
      if (dto.diagnoses?.length) {
        await tx.condition.createMany({
          data: dto.diagnoses.map((d) => ({
            patientId, encounterId,
            codeSystem: ICD10, code: d.code, display: d.display,
            clinicalStatus: d.clinicalStatus ?? ConditionClinicalStatus.ACTIVE,
          })),
        });
      }

      // 4. Prescriptions (MedicationRequests)
      if (dto.prescriptions?.length) {
        for (const p of dto.prescriptions) {
          await tx.medicationRequest.create({
            data: {
              patientId, encounterId, prescriberId: practitionerId,
              medicationSystem: RXNORM,
              medicationCode: p.medicationCode, medicationDisplay: p.medicationDisplay,
              medicineId: p.medicineId,
              dosage: p.dosage, frequency: p.frequency,
              durationDays: p.durationDays, quantity: p.quantity,
              instructions: p.instructions, status: 'ACTIVE',
            },
          });
        }
      }

      // 5. Close the encounter
      const closed = await tx.encounter.update({
        where: { id: encounterId },
        data: { status: 'FINISHED', endedAt: new Date() },
      });

      // 6. Complete the linked appointment + queue ticket, if present
      if (encounter.appointmentId) {
        await tx.appointment.update({
          where: { id: encounter.appointmentId },
          data: { status: 'COMPLETED' },
        });
        await tx.queueTicket.updateMany({
          where: { appointmentId: encounter.appointmentId, status: { not: 'DONE' } },
          data: { status: 'DONE', completedAt: new Date() },
        });
      }

      return {
        encounter: closed,
        counts: {
          observations: dto.observations?.length ?? 0,
          diagnoses: dto.diagnoses?.length ?? 0,
          prescriptions: dto.prescriptions?.length ?? 0,
        },
      };
    });
  }

  /** Read a finished consultation with all its clinical children. */
  async findOne(encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        soapNote: true,
        conditions: true,
        observations: { orderBy: { effectiveAt: 'desc' } },
        medicationRequests: true,
      },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');
    return encounter;
  }

  // --- helpers ---------------------------------------------------------------

  private async assertEncounterOpen(encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException('Encounter not found');
    if (encounter.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This consultation is already finished');
    }
    return encounter;
  }
}
