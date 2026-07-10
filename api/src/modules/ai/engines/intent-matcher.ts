import { Period } from '../../reports/date-range';

/**
 * Rules-based intent matcher for natural-language clinic analytics.
 *
 * This is the deterministic engine behind queries like "show revenue this
 * month". It maps free text onto a fixed set of intents, each of which the AI
 * service resolves by calling a real ReportsService function — so answers come
 * from live data, not canned strings. An LLM path can replace this later, but
 * this always works in a demo without a key.
 */

export type AnalyticsIntent =
  | 'REVENUE'
  | 'MISSED_APPOINTMENTS'
  | 'EXPIRING_MEDICINES'
  | 'TOP_DISEASES'
  | 'DOCTOR_PERFORMANCE'
  | 'PATIENT_COUNT'
  | 'UNKNOWN';

export interface MatchedIntent {
  intent: AnalyticsIntent;
  period: Period;
  /** The keywords that triggered the match, for transparency in the reply. */
  matchedOn: string[];
}

interface Rule {
  intent: AnalyticsIntent;
  /** Any of these phrases present → candidate; score = number of hits. */
  keywords: string[];
}

const RULES: Rule[] = [
  { intent: 'REVENUE', keywords: ['revenue', 'income', 'earnings', 'money', 'sales', 'collected'] },
  { intent: 'MISSED_APPOINTMENTS', keywords: ['missed', 'no show', 'no-show', 'noshow', 'skipped appointment', 'did not show'] },
  { intent: 'EXPIRING_MEDICINES', keywords: ['expire', 'expiring', 'expiry', 'near expiry', 'out of date'] },
  { intent: 'TOP_DISEASES', keywords: ['disease', 'diagnos', 'condition', 'common illness', 'top illness'] },
  { intent: 'DOCTOR_PERFORMANCE', keywords: ['doctor performance', 'busiest doctor', 'consultations per', 'top doctor', 'doctor stats'] },
  { intent: 'PATIENT_COUNT', keywords: ['how many patients', 'patient count', 'number of patients', 'new patients', 'patient growth'] },
];

const PERIOD_HINTS: { period: Period; keywords: string[] }[] = [
  { period: 'today', keywords: ['today', 'now', 'this day'] },
  { period: 'week', keywords: ['week', 'this week', 'last 7', 'past week'] },
  { period: 'month', keywords: ['month', 'this month', 'monthly'] },
  { period: 'year', keywords: ['year', 'this year', 'annual', 'ytd'] },
];

/** Detect the period referenced in the query; default to month. */
export function detectPeriod(text: string): Period {
  const q = text.toLowerCase();
  for (const hint of PERIOD_HINTS) {
    if (hint.keywords.some((k) => q.includes(k))) return hint.period;
  }
  return 'month';
}

/** Match a query to its best-scoring intent (most keyword hits wins). */
export function matchIntent(text: string): MatchedIntent {
  const q = text.toLowerCase();
  let best: { intent: AnalyticsIntent; hits: string[] } = { intent: 'UNKNOWN', hits: [] };

  for (const rule of RULES) {
    const hits = rule.keywords.filter((k) => q.includes(k));
    if (hits.length > best.hits.length) {
      best = { intent: rule.intent, hits };
    }
  }

  return { intent: best.intent, period: detectPeriod(text), matchedOn: best.hits };
}
