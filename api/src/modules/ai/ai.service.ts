import { Injectable, NotFoundException } from '@nestjs/common';
import { AiInteractionKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { matchIntent, AnalyticsIntent } from './engines/intent-matcher';
import { llmEnabled, classifyQuery, phraseAnswer, phrasePatientAnswer, answerGeneral, Period } from './engines/llm';
import {
  generateSoap, summarizeHistory, generateReferral, generateDischargeSummary,
  generateFollowUpReminder, suggestMedicines, PatientContext, DEMO_DISCLAIMER,
} from './engines/document-templates';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  /**
   * Natural-language analytics.
   *
   * When an LLM key is configured, the model classifies the question (better than
   * keywords) and phrases the reply — but the numbers are always fetched from the
   * database by fetchForIntent, never invented by the model. Without a key, it
   * falls back to the deterministic keyword matcher, so the feature always works.
   */
  async analytics(query: string) {
    if (llmEnabled()) {
      try {
        return await this.analyticsWithLlm(query);
      } catch {
        // Any LLM/network failure degrades gracefully to the deterministic path.
      }
    }
    return this.analyticsDeterministic(query);
  }

  private async analyticsWithLlm(query: string) {
    const { intent, period, patientRef } = await classifyQuery(query);

    // Patient-specific question → look up the real record and answer from it.
    if (patientRef) {
      const profile = await this.patientLookup(patientRef);
      if (!profile) {
        const text = `I couldn't find a patient matching "${patientRef}". Try a full name or MRN.`;
        await this.log(AiInteractionKind.NL_ANALYTICS, query, text);
        return { intent: 'UNKNOWN', period, matchedOn: [], text, data: null, engine: 'LLM', disclaimer: DEMO_DISCLAIMER };
      }
      let text: string;
      try {
        text = await phrasePatientAnswer(query, profile);
      } catch {
        text = `${profile.name} (${profile.mrn}): ${profile.diagnoses.map((d) => d.name).join(', ') || 'no diagnoses on file'}. ` +
          `Outstanding balance $${profile.billing.outstanding.toFixed(2)}.`;
      }
      await this.log(AiInteractionKind.NL_ANALYTICS, query, text);
      return { intent, period, matchedOn: [], text, data: profile, engine: 'LLM', disclaimer: DEMO_DISCLAIMER };
    }

    if (intent === 'UNKNOWN') {
      const text = await answerGeneral(query);
      await this.log(AiInteractionKind.NL_ANALYTICS, query, text);
      return { intent, period, matchedOn: [], text, data: null, engine: 'LLM', disclaimer: DEMO_DISCLAIMER };
    }

    const { data, fallbackText } = await this.fetchForIntent(intent, period);
    let text: string;
    try {
      text = await phraseAnswer(query, intent, data); // real data in, natural language out
    } catch {
      text = fallbackText; // if phrasing fails, use the deterministic sentence
    }

    await this.log(AiInteractionKind.NL_ANALYTICS, query, text);
    return { intent, period, matchedOn: [], text, data, engine: 'LLM', disclaimer: DEMO_DISCLAIMER };
  }

  private async analyticsDeterministic(query: string) {
    const { intent, period, matchedOn } = matchIntent(query);
    if (intent === 'UNKNOWN') {
      const text =
        'I can answer questions about revenue, missed appointments, expiring medicines, ' +
        'top diagnoses, doctor performance, and patient counts. Try: "show revenue this month".';
      await this.log(AiInteractionKind.NL_ANALYTICS, query, text);
      return { intent, period, matchedOn, text, data: null, engine: 'TEMPLATE', disclaimer: DEMO_DISCLAIMER };
    }
    const { data, fallbackText } = await this.fetchForIntent(intent, period);
    await this.log(AiInteractionKind.NL_ANALYTICS, query, fallbackText);
    return { intent, period, matchedOn, text: fallbackText, data, engine: 'TEMPLATE', disclaimer: DEMO_DISCLAIMER };
  }

  /**
   * Single source of truth for turning an intent into REAL data + a plain
   * fallback sentence. Both the LLM and deterministic paths use this, so the
   * figures are identical regardless of how the answer is phrased.
   */
  private async fetchForIntent(intent: AnalyticsIntent, period: Period): Promise<{ data: unknown; fallbackText: string }> {
    switch (intent) {
      case 'REVENUE': {
        const r = await this.reports.revenueForPeriod(period);
        return { data: r, fallbackText: `Revenue for ${period}: ${r.revenue.toFixed(2)} across ${r.payments} payment(s).` };
      }
      case 'MISSED_APPOINTMENTS': {
        const rows = await this.reports.missedAppointments(period);
        return { data: rows, fallbackText: `${rows.length} missed appointment(s) in the selected ${period}.` };
      }
      case 'EXPIRING_MEDICINES': {
        const alerts = await this.expiringMedicines();
        return { data: alerts, fallbackText: `${alerts.length} medicine batch(es) expiring within 60 days.` };
      }
      case 'TOP_DISEASES': {
        const d = await this.reports.diseaseStats(8);
        return { data: d, fallbackText: d.length ? `Top diagnosis: ${d[0].display} (${d[0].count} cases).` : 'No diagnosis data yet.' };
      }
      case 'DOCTOR_PERFORMANCE': {
        const d = await this.reports.doctorPerformance(period);
        return { data: d, fallbackText: d.length ? `Busiest: ${d[0].name} with ${d[0].consultations} consultation(s).` : 'No consultation data yet.' };
      }
      case 'PATIENT_COUNT': {
        const growth = await this.reports.patientGrowth(30);
        const total = growth.length ? growth[growth.length - 1].total : 0;
        return { data: { total, series: growth }, fallbackText: `Total patients: ${total}.` };
      }
      default:
        return { data: null, fallbackText: 'No data available.' };
    }
  }

  /**
   * Look up a single patient by name or MRN and assemble a full profile —
   * demographics, diagnoses, allergies, current meds, assigned doctor, visit
   * count, and billing totals (invoiced / paid / outstanding). This is what lets
   * the assistant answer "tell me about X" or "how much has X paid?".
   */
  async patientLookup(nameOrMrn: string) {
    const q = nameOrMrn.trim();
    const patient = await this.prisma.patient.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { mrn: { equals: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        allergies: { where: { deletedAt: null } },
        conditions: { where: { deletedAt: null }, orderBy: { recordedAt: 'desc' }, take: 20 },
        histories: { orderBy: { notedAt: 'desc' } },
        medicationRequests: { where: { status: 'ACTIVE', deletedAt: null }, take: 20 },
      },
    });
    if (!patient) return null;

    // Billing totals across the patient's invoices.
    const invoices = await this.prisma.invoice.findMany({
      where: { patientId: patient.id, deletedAt: null },
      select: { total: true, amountPaid: true, status: true, createdAt: true },
    });
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalPaid = invoices.reduce((s, i) => s + Number(i.amountPaid), 0);

    // Assigned doctor = most frequent practitioner across recent encounters.
    const lastEncounter = await this.prisma.encounter.findFirst({
      where: { patientId: patient.id },
      orderBy: { startedAt: 'desc' },
      include: { practitioner: { select: { firstName: true, lastName: true, specialty: true } } },
    });
    const visitCount = await this.prisma.encounter.count({ where: { patientId: patient.id } });

    return {
      mrn: patient.mrn,
      name: `${patient.firstName} ${patient.lastName}`,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phone,
      city: patient.city,
      assignedDoctor: lastEncounter?.practitioner
        ? `Dr. ${lastEncounter.practitioner.firstName} ${lastEncounter.practitioner.lastName}`
        : null,
      diagnoses: patient.conditions.map((c) => ({ code: c.code, name: c.display })),
      allergies: patient.allergies.map((a) => ({ substance: a.substanceDisplay, reaction: a.reaction, criticality: a.criticality })),
      history: patient.histories.map((h) => ({ type: h.type, summary: h.summary })),
      medications: patient.medicationRequests.map((m) => ({ name: m.medicationDisplay, frequency: m.frequency })),
      visits: visitCount,
      billing: {
        totalInvoiced: Number(totalInvoiced.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        outstanding: Number((totalInvoiced - totalPaid).toFixed(2)),
        invoiceCount: invoices.length,
      },
    };
  }

  async soap(patientId: string, complaint = '') {
    const ctx = await this.loadContext(patientId);
    const result = generateSoap(ctx, complaint);
    await this.log(AiInteractionKind.SOAP_GENERATION, `SOAP for ${patientId}`, JSON.stringify(result));
    return result;
  }

  async summarize(patientId: string) {
    const ctx = await this.loadContext(patientId);
    const result = summarizeHistory(ctx);
    await this.log(AiInteractionKind.HISTORY_SUMMARY, `Summary for ${patientId}`, result.summary);
    return result;
  }

  async referral(patientId: string, toSpecialty: string, reason = '') {
    const ctx = await this.loadContext(patientId);
    const result = generateReferral(ctx, toSpecialty, reason);
    await this.log(AiInteractionKind.REFERRAL_LETTER, `Referral for ${patientId} to ${toSpecialty}`, result.body);
    return result;
  }

  async discharge(patientId: string, visitReason = '') {
    const ctx = await this.loadContext(patientId);
    const result = generateDischargeSummary(ctx, visitReason);
    await this.log(AiInteractionKind.DISCHARGE_SUMMARY, `Discharge for ${patientId}`, result.body);
    return result;
  }

  async followUp(patientId: string, whenText = '') {
    const ctx = await this.loadContext(patientId);
    const result = generateFollowUpReminder(ctx, whenText);
    await this.log(AiInteractionKind.FOLLOWUP_DRAFT, `Follow-up for ${patientId}`, result.message);
    return result;
  }

  async medicines(conditionCodes: string[]) {
    const result = suggestMedicines(conditionCodes);
    await this.log(AiInteractionKind.MEDICINE_SUGGESTION, conditionCodes.join(','), JSON.stringify(result.suggestions));
    return result;
  }

  // --- helpers ---------------------------------------------------------------

  /** Near-expiry medicine batches (within 60 days), for the analytics intent. */
  private async expiringMedicines() {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 60);
    const batches = await this.prisma.batch.findMany({
      where: { quantityOnHand: { gt: 0 }, expiryDate: { lte: horizon, gt: new Date() } },
      include: { medicine: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    return batches.map((b) => ({
      medicine: b.medicine.name, batchNumber: b.batchNumber,
      expiryDate: b.expiryDate, quantityOnHand: b.quantityOnHand,
    }));
  }

  /** Assemble the clinical context the document generators need. */
  private async loadContext(patientId: string): Promise<PatientContext> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      include: {
        allergies: { where: { deletedAt: null } },
        conditions: { where: { deletedAt: null }, orderBy: { recordedAt: 'desc' }, take: 10 },
        medicationRequests: { where: { status: 'ACTIVE', deletedAt: null }, take: 10 },
        observations: { orderBy: { effectiveAt: 'desc' }, take: 10 },
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const age = this.ageFrom(patient.dateOfBirth);
    return {
      firstName: patient.firstName,
      lastName: patient.lastName,
      age,
      gender: patient.gender,
      allergies: patient.allergies.map((a) => ({ substanceDisplay: a.substanceDisplay, reaction: a.reaction })),
      conditions: patient.conditions.map((c) => ({ code: c.code, display: c.display })),
      medications: patient.medicationRequests.map((m) => ({
        medicationDisplay: m.medicationDisplay, dosage: m.dosage, frequency: m.frequency,
      })),
      recentObservations: patient.observations.map((o) => ({
        display: o.display, valueNumber: o.valueNumber, unit: o.unit, isAbnormal: o.isAbnormal,
      })),
    };
  }

  private ageFrom(dob: Date): number {
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
    return age;
  }

  private async log(kind: AiInteractionKind, prompt: string, response: string) {
    await this.prisma.aiInteraction.create({
      data: { kind, prompt, response, engine: 'TEMPLATE' },
    });
  }
}
