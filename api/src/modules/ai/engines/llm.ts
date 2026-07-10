import type { AnalyticsIntent } from './intent-matcher';
import type { Period } from '../../reports/date-range';

export type { Period };

/**
 * LLM layer for the AI assistant.
 *
 * Design principle: the model classifies the question and phrases the answer,
 * but it NEVER invents clinic numbers. It picks an intent (which the service
 * resolves against the real database) and, given the true figures back, writes a
 * natural-language reply. If no ANTHROPIC_API_KEY is configured, callers fall
 * back to the deterministic keyword matcher — so the feature always works.
 */

export function llmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const MODEL = process.env.AI_MODEL ?? 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const VALID_INTENTS: AnalyticsIntent[] = [
  'REVENUE', 'MISSED_APPOINTMENTS', 'EXPIRING_MEDICINES',
  'TOP_DISEASES', 'DOCTOR_PERFORMANCE', 'PATIENT_COUNT', 'UNKNOWN',
];
const VALID_PERIODS = ['today', 'week', 'month', 'year'] as const;

export interface ClassifiedQuery {
  intent: AnalyticsIntent;
  period: Period;
  /** If the question is about a specific person, their name or MRN; else null. */
  patientRef: string | null;
}

async function callAnthropic(system: string, user: string, maxTokens = 512): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n').trim();
}

/**
 * Step 1 — classify the free-text question into a known intent + period.
 * Returns strict JSON we can trust to route to a real data function.
 */
export async function classifyQuery(query: string): Promise<ClassifiedQuery> {
  const system =
    'You classify questions for a clinic management system. ' +
    'Respond with ONLY a JSON object: {"intent": <one of ' + VALID_INTENTS.join('|') + '>, ' +
    '"period": <one of today|week|month|year>, "patientRef": <patient name or MRN if the question ' +
    'is about a specific person, else null>}. No prose, no code fences. ' +
    'Set patientRef when the user asks about an individual (e.g. "tell me about Amara Okafor", ' +
    '"how much has MRN-100002 paid"). Use UNKNOWN intent if it is not about revenue, missed ' +
    'appointments, expiring medicines, top diagnoses, doctor performance, or patient counts. ' +
    'Default period to "month".';
  const raw = await callAnthropic(system, query, 128);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as ClassifiedQuery;
    const intent = VALID_INTENTS.includes(parsed.intent) ? parsed.intent : 'UNKNOWN';
    const period = (VALID_PERIODS as readonly string[]).includes(parsed.period) ? parsed.period : 'month';
    const patientRef = typeof parsed.patientRef === 'string' && parsed.patientRef.trim() ? parsed.patientRef.trim() : null;
    return { intent, period, patientRef };
  } catch {
    return { intent: 'UNKNOWN', period: 'month', patientRef: null };
  }
}

/** Given a patient's real profile, answer the question naturally. */
export async function phrasePatientAnswer(query: string, profile: unknown): Promise<string> {
  const system =
    'You are a clinic assistant. Answer the question about this patient using ONLY the profile ' +
    'data (JSON). You may compute billing figures (e.g. outstanding = invoiced - paid) from the ' +
    'given numbers. Never invent diagnoses, medications, or amounts. Be concise and specific ' +
    '(1-4 sentences). Use $ and thousands separators for money. This is demonstration data, not ' +
    'medical advice. Do not mention JSON.';
  const user = `Question: ${query}\nPatient profile: ${JSON.stringify(profile)}`;
  return callAnthropic(system, user, 320);
}

/**
 * Step 2 — given the REAL data the service fetched, write a natural, concise
 * answer. The data is passed in as JSON; the model must not invent figures.
 */
export async function phraseAnswer(query: string, intent: AnalyticsIntent, data: unknown): Promise<string> {
  const system =
    'You are a clinic operations assistant. Given a user question and the REAL data ' +
    '(as JSON) retrieved from the database, write a concise, useful answer. You MAY compute ' +
    'derived figures from the given numbers (percentages, ratios, month-over-month change, ' +
    'what to reorder and by how much) and flag risks, but use ONLY the numbers present — never ' +
    'invent or estimate absent figures. If the data is empty or null, say there is no data yet. ' +
    'Be specific and actionable in 1-4 sentences. Do not mention JSON or that you were given data. ' +
    'Use a $ prefix and thousands separators for currency.';
  const user = `Question: ${query}\nIntent: ${intent}\nData: ${JSON.stringify(data)}`;
  return callAnthropic(system, user, 320);
}

/**
 * Free-form fallback for UNKNOWN questions: let the model answer helpfully about
 * what the assistant CAN do, or handle general clinic-ops questions, without
 * fabricating specific clinic statistics.
 */
export async function answerGeneral(query: string): Promise<string> {
  const system =
    'You are the AI assistant inside Techciko Health Suite, a clinic management system. ' +
    'You can report on revenue, missed appointments, expiring medicines, top diagnoses, ' +
    'doctor performance, and patient counts when asked. For anything requiring specific ' +
    'clinic numbers you do not have, explain what you can report and invite the user to ask. ' +
    'Never fabricate specific statistics. Keep answers to 1-3 sentences.';
  return callAnthropic(system, query, 256);
}
