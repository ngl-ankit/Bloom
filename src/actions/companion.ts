"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, periods } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { actionFail, actionOk, rateLimit } from "@/lib/api";
import { aiChatSchema } from "@/lib/validate";
import { AiUnavailableError, SYSTEM_PROMPT, chatComplete, fallbackAnswer, type ChatMessage } from "@/lib/ai";
import { isAiConfigured } from "@/lib/env";
import { formatDateOnly, predictNextPeriod } from "@/lib/cycle";

const MAX_HISTORY = 12;

export async function listConversations() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.createdAt));
    return { conversations: rows };
  } catch (e) { return actionFail(e); }
}

export async function getMessages(conversationId: string) {
  try {
    const user = await requireUser();
    const owned = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)))
      .limit(1);
    if (!owned.length) return { error: "Conversation not found." };
    const rows = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt));
    return { messages: rows };
  } catch (e) { return actionFail(e); }
}

export async function deleteConversation(conversationId: string) {
  try {
    const user = await requireUser();
    const rows = await db.delete(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id))).returning({ id: conversations.id });
    if (!rows.length) return { error: "Conversation not found." };
    return { deleted: true };
  } catch (e) { return actionFail(e); }
}

/**
 * Send a message. With a configured provider the reply comes from the AI using
 * ONLY: the conversation history, the system prompt, and a minimal cycle-stats
 * summary. Raw journals/symptoms are never sent unless the user writes them
 * into the message themselves.
 */
export async function sendMessage(input: unknown) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai:${user.id}`, 20, 3600_000))
      return { error: "You've reached the companion limit for this hour. Please try again later." };
    const data = aiChatSchema.parse(input);

    let conversationId = data.conversationId ?? null;
    if (conversationId) {
      const owned = await db.select({ id: conversations.id }).from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id))).limit(1);
      if (!owned.length) return { error: "Conversation not found." };
    } else {
      const created = await db.insert(conversations)
        .values({ userId: user.id, title: data.message.slice(0, 60) }).returning();
      conversationId = created[0].id;
    }

    await db.insert(messages).values({ conversationId, role: "user", content: data.message });

    const history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(MAX_HISTORY);

    let contextNote = "";
    if (isAiConfigured()) {
      const spans = await db.select({ startDate: periods.startDate, endDate: periods.endDate })
        .from(periods).where(eq(periods.userId, user.id));
      if (spans.length) {
        const p = predictNextPeriod(spans, formatDateOnly(new Date()));
        contextNote = `\n\n[Context the user chose to share from their own tracker: average cycle length ${p.averageCycleLength ?? "unknown"} days, average period length ${p.averagePeriodLength ?? "unknown"} days. Present these as the user's own logged averages — never as predictions or medical facts.]`;
      }
    }

    const chat: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + contextNote },
      ...history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    let reply: string;
    let offlineMode = false;
    try {
      reply = await chatComplete(chat);
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        offlineMode = true;
        reply = fallbackAnswer(data.message);
      } else throw e;
    }

    const saved = await db.insert(messages).values({ conversationId, role: "assistant", content: reply }).returning();
    return { conversationId, reply: saved[0], offlineMode };
  } catch (e) { return actionFail(e); }
}
