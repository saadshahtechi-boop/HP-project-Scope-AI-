'use client';

import { useState } from 'react';
import { Sparkles, Send, BarChart3, TrendingUp } from 'lucide-react';
import { useAnalyticsQuery, type AnalyticsResponse } from '../api/use-ai';

interface ChatItem { role: 'user' | 'assistant'; text: string; data?: unknown; }

const SUGGESTIONS = [
  'Show revenue this month',
  'Which patients missed appointments?',
  'Which medicines expire soon?',
  'What are the top diagnoses?',
  'Who is the busiest doctor?',
];

/**
 * AI assistant surface. Sends natural-language questions to /ai/analytics and
 * renders the deterministic engine's answers. Every reply carries the
 * demonstration-only disclaimer the backend attaches.
 */
export function AiAssistant() {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState<ChatItem[]>([]);
  const ask = useAnalyticsQuery();

  const send = (q: string) => {
    if (!q.trim()) return;
    setChat((c) => [...c, { role: 'user', text: q }]);
    setInput('');
    ask.mutate(q, {
      onSuccess: (res: AnalyticsResponse) => {
        setChat((c) => [...c, { role: 'assistant', text: res.text, data: res.data }]);
      },
      onError: () => {
        setChat((c) => [...c, { role: 'assistant', text: 'Sorry — I could not answer that. Is the API running?' }]);
      },
    });
  };

  return (
    <div className="p-5 md:p-7 max-w-[820px] mx-auto w-full flex flex-col h-full">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: '#6366f11a' }}>
            <Sparkles size={17} style={{ color: '#6366f1' }} />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">AI Assistant</h1>
        </div>
        <p className="text-[13px] mt-1" style={{ color: 'var(--sub)' }}>
          Ask about clinic analytics in plain language. Answers come from live data.
        </p>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto rounded-xl border mb-4 p-4 space-y-3"
        style={{ borderColor: 'var(--border)', background: 'var(--card)', minHeight: 320 }}>
        {chat.length === 0 && (
          <div className="h-full grid place-items-center text-center py-10">
            <div>
              <BarChart3 size={28} className="mx-auto mb-3" style={{ color: '#cbd5e1' }} />
              <p className="text-[13px] mb-4" style={{ color: 'var(--sub)' }}>Try one of these to get started:</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-[12px] px-3 h-8 rounded-full border transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--sub)', background: 'var(--faint)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px]"
              style={m.role === 'user'
                ? { background: 'var(--accent)', color: 'white' }
                : { background: 'var(--faint)', color: 'var(--text)' }}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium" style={{ color: '#6366f1' }}>
                  <Sparkles size={11} /> Assistant
                </div>
              )}
              <div>{m.text}</div>
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3.5 py-2.5 text-[13px]" style={{ background: 'var(--faint)', color: 'var(--sub)' }}>
              <span className="inline-flex items-center gap-1.5"><TrendingUp size={13} /> Analyzing…</span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 px-3 h-11 rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask about revenue, appointments, diagnoses…"
          className="bg-transparent outline-none text-[13px] flex-1" style={{ color: 'var(--text)' }} />
        <button onClick={() => send(input)} disabled={ask.isPending}
          className="w-8 h-8 grid place-items-center rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
          <Send size={15} />
        </button>
      </div>
      <p className="text-[11px] mt-2 text-center" style={{ color: '#94a3b8' }}>
        AI-generated demonstration. Not clinical advice — verify before acting.
      </p>
    </div>
  );
}
