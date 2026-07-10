/**
 * Deterministic (template-based) clinical document generators.
 *
 * These produce structured drafts from real patient data without an LLM, so the
 * demo always works. Every output is explicitly marked as a demonstration draft
 * requiring clinician review — nothing here is clinical advice.
 *
 * When the LLM path is enabled, these same signatures are used; only the body
 * production differs.
 */

export const DEMO_DISCLAIMER =
  'AI-generated demonstration draft. Not clinical advice — must be reviewed and signed by a licensed clinician before use.';

export interface PatientContext {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  allergies: { substanceDisplay: string; reaction?: string | null }[];
  conditions: { code: string; display: string }[];
  medications: { medicationDisplay: string; dosage: string; frequency: string }[];
  recentObservations: { display: string; valueNumber?: number | null; unit?: string | null; isAbnormal?: boolean | null }[];
}

function abnormalVitals(ctx: PatientContext): string {
  const abn = ctx.recentObservations.filter((o) => o.isAbnormal);
  if (!abn.length) return 'Vitals within normal limits.';
  return 'Notable findings: ' + abn.map((o) => `${o.display} ${o.valueNumber ?? ''}${o.unit ? ' ' + o.unit : ''} (abnormal)`).join('; ') + '.';
}

/** SOAP note draft from presenting complaint + context. */
export function generateSoap(ctx: PatientContext, complaint: string) {
  const dxList = ctx.conditions.map((c) => `${c.display} (${c.code})`).join(', ') || 'to be determined';
  return {
    subjective: `${ctx.age}-year-old ${ctx.gender.toLowerCase()} presenting with ${complaint || 'the concern noted at intake'}. ` +
      (ctx.allergies.length ? `Known allergies: ${ctx.allergies.map((a) => a.substanceDisplay).join(', ')}.` : 'No known drug allergies.'),
    objective: abnormalVitals(ctx),
    assessment: `Working assessment: ${dxList}.`,
    plan: `Continue current medications (${ctx.medications.map((m) => m.medicationDisplay).join(', ') || 'none on record'}). ` +
      'Order relevant investigations as indicated and arrange appropriate follow-up.',
    disclaimer: DEMO_DISCLAIMER,
  };
}

/** Plain-language summary of the patient's history. */
export function summarizeHistory(ctx: PatientContext): { summary: string; disclaimer: string } {
  const parts: string[] = [];
  parts.push(`${ctx.firstName} ${ctx.lastName} is a ${ctx.age}-year-old ${ctx.gender.toLowerCase()}.`);
  if (ctx.conditions.length) {
    parts.push(`Active conditions include ${ctx.conditions.map((c) => c.display).join(', ')}.`);
  }
  if (ctx.medications.length) {
    parts.push(`Current medications: ${ctx.medications.map((m) => `${m.medicationDisplay} (${m.frequency})`).join(', ')}.`);
  }
  if (ctx.allergies.length) {
    parts.push(`Allergies: ${ctx.allergies.map((a) => `${a.substanceDisplay}${a.reaction ? ` — ${a.reaction}` : ''}`).join(', ')}.`);
  }
  parts.push(abnormalVitals(ctx));
  return { summary: parts.join(' '), disclaimer: DEMO_DISCLAIMER };
}

/** Referral letter draft to a named specialty. */
export function generateReferral(ctx: PatientContext, toSpecialty: string, reason: string) {
  const body =
    `Dear ${toSpecialty} Colleague,\n\n` +
    `I am referring ${ctx.firstName} ${ctx.lastName}, a ${ctx.age}-year-old ${ctx.gender.toLowerCase()}, for your assessment. ` +
    `${reason || 'Please see the clinical details below.'}\n\n` +
    `Relevant history: ${ctx.conditions.map((c) => c.display).join(', ') || 'nil significant'}. ` +
    `Current medications: ${ctx.medications.map((m) => m.medicationDisplay).join(', ') || 'none'}. ` +
    `Allergies: ${ctx.allergies.map((a) => a.substanceDisplay).join(', ') || 'none known'}.\n\n` +
    `${abnormalVitals(ctx)}\n\n` +
    `Thank you for seeing this patient. I would be grateful for your assessment and recommendations.\n\n` +
    `Kind regards,\nTechciko Health Suite`;
  return { body, disclaimer: DEMO_DISCLAIMER };
}

/** Discharge summary draft (outpatient visit close). */
export function generateDischargeSummary(ctx: PatientContext, visitReason: string) {
  const body =
    `DISCHARGE SUMMARY\n\n` +
    `Patient: ${ctx.firstName} ${ctx.lastName} · ${ctx.age}y ${ctx.gender.toLowerCase()}\n` +
    `Reason for visit: ${visitReason || 'outpatient consultation'}\n\n` +
    `Diagnoses: ${ctx.conditions.map((c) => `${c.display} (${c.code})`).join(', ') || 'see notes'}\n` +
    `${abnormalVitals(ctx)}\n\n` +
    `Medications on discharge: ${ctx.medications.map((m) => `${m.medicationDisplay} ${m.dosage} ${m.frequency}`).join(', ') || 'none'}\n` +
    `Allergies: ${ctx.allergies.map((a) => a.substanceDisplay).join(', ') || 'none known'}\n\n` +
    `Follow-up: as clinically indicated. Patient advised to return if symptoms worsen.`;
  return { body, disclaimer: DEMO_DISCLAIMER };
}

/** Follow-up reminder draft (SMS/email tone). */
export function generateFollowUpReminder(ctx: PatientContext, whenText: string) {
  const message =
    `Hi ${ctx.firstName}, this is a reminder from Techciko Health Suite about your follow-up ${whenText || 'appointment'}. ` +
    `Please reply to confirm or call us to reschedule. Thank you.`;
  return { message, disclaimer: DEMO_DISCLAIMER };
}

/**
 * Medicine suggestions — EXPLICITLY demonstration-only, as required by the brief.
 * These are generic reference associations, never a prescription.
 */
const REFERENCE_ASSOCIATIONS: Record<string, string[]> = {
  I10: ['Amlodipine', 'Lisinopril', 'Hydrochlorothiazide'],
  'E11.9': ['Metformin', 'Empagliflozin'],
  'E78.5': ['Atorvastatin', 'Rosuvastatin'],
  'J06.9': ['Supportive care', 'Paracetamol for symptom relief'],
  'F41.9': ['SSRIs (e.g. sertraline)', 'CBT referral'],
};

export function suggestMedicines(conditionCodes: string[]) {
  const suggestions = conditionCodes.map((code) => ({
    code,
    commonlyAssociated: REFERENCE_ASSOCIATIONS[code] ?? ['No reference association on file'],
  }));
  return {
    suggestions,
    disclaimer:
      'DEMONSTRATION ONLY. These are generic reference associations for illustration, NOT a prescription or clinical recommendation. ' +
      'All prescribing decisions must be made by a licensed clinician.',
  };
}
