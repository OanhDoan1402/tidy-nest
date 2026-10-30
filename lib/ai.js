// Minimal Google Gemini client (free tier). Returns null on any problem so callers can fall back.
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

export function aiReady() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// turns: [{ role: 'user' | 'model', text }]
export async function gemini({ system, turns, json = false, maxTokens = 200, temperature = 0.9 }) {
  if (!aiReady()) return null;
  const merged = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.parts[0].text += '\n' + t.text;
    else merged.push({ role: t.role, parts: [{ text: t.text }] });
  }
  if (!merged.length || merged[0].role !== 'user') merged.unshift({ role: 'user', parts: [{ text: 'Start.' }] });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: merged,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(json ? { responseMimeType: 'application/json' } : {}),
          ...(/2\.5-flash/.test(MODEL()) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const d = await r.json();
    const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
