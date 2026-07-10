import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';

/**
 * The AI assistant's natural-language analytics. Posts a free-text query to
 * /ai/analytics, which matches an intent and answers from real Reports data.
 * Modeled as a mutation (not a query) because each ask is an explicit action.
 */

export interface AnalyticsResponse {
  intent: string;
  period: string;
  matchedOn: string[];
  text: string;
  data: unknown;
  disclaimer: string;
}

export function useAnalyticsQuery() {
  return useMutation({
    mutationFn: async (query: string) =>
      (await api.post<AnalyticsResponse>('/ai/analytics', { query })).data,
  });
}
