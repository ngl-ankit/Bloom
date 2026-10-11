/**
 * AI provider abstraction. Uses any OpenAI-chat-compatible endpoint
 * (Grok / x.ai, OpenAI, OpenRouter, ...) configured via env vars.
 * The API key NEVER leaves the server. If unconfigured, callers must
 * fall back to a graceful static experience — core features keep working.
 */
import { getEnv, isAiConfigured } from "./env";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const SYSTEM_PROMPT = `You are Bloom, a warm, empathetic wellness companion for menstrual health and self-care.
Guidelines:
- Be supportive, natural, and non-judgmental. Never lecture.
- Answer general menstrual health and self-care questions with balanced, evidence-informed general information.
- You may help the user reflect on patterns in THEIR OWN recorded data when it is provided in the context.
- Clearly distinguish general information from observations about the user's own logged data.
- NEVER diagnose conditions, never interpret symptoms as a diagnosis, never prescribe medication or doses.
- If the user describes severe or urgent symptoms (e.g., very heavy bleeding, severe pelvic pain, fever with pain, pregnancy concerns, signs of shock), calmly advise contacting a healthcare professional or emergency services.
- If asked something you cannot answer safely, say so honestly and suggest a clinician.
- You are not a doctor and never a replacement for professional care. Do not claim to be.
- Never invent cycle predictions, medical facts, or statistics. Keep answers concise and kind.`;

export class AiUnavailableError extends Error {}

export async function chatComplete(
  history: ChatMessage[],
  maxTokens = 700,
): Promise<string> {
  if (!isAiConfigured()) throw new AiUnavailableError("AI provider is not configured");
  const env = getEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${env.AI_PROVIDER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_PROVIDER_MODEL || "grok-3-mini",
        messages: history,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new AiUnavailableError(`AI provider error ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new AiUnavailableError("AI provider returned an empty response");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/** Very small local fallback answers so the companion is never a dead end. */
export function fallbackAnswer(userMessage: string): string {
  const m = userMessage.toLowerCase();
  if (/cramp|pain|hurt|ache/.test(m))
    return "I can't give personal medical advice, but many people find a warm compress, gentle stretching, rest, and hydration helpful with cramps. If your pain is severe, sudden, or different from your usual pattern, please check in with a healthcare professional.";
  if (/sad|down|cry|overwhelm|anxious|stress/.test(m))
    return "That sounds really hard, and it's okay to feel this way. Rest, warmth, a favorite snack, or talking with someone you trust can help. Your feelings are valid — and if things feel overwhelming for a while, reaching out to someone you trust or a professional is a caring thing to do for yourself.";
  if (/sleep|tired|fatigue|energy/.test(m))
    return "Low energy around your cycle is something many people experience. Gentle movement earlier in the day, regular meals, and letting yourself rest can help. If exhaustion is persistent or severe, it's worth mentioning to a clinician.";
  return "I'm here to listen and help you reflect. Right now I'm running in offline mode, so I can't chat fully — but your journals, cycle calendar, and care tools all still work. For anything medical, a healthcare professional is always the right guide.";
}
