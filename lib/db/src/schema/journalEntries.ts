import { createInsertSchema } from "drizzle-zod";
import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { bloomProfilesTable } from "./profiles";
import { flowEnum } from "./periods";

export const journalEntriesTable = pgTable(
  "bloom_journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => bloomProfilesTable.clerkUserId, { onDelete: "cascade" }),
    recordedOn: date("recorded_on", { mode: "string" }).notNull(),
    symptoms: text("symptoms").array().notNull().default([]),
    pain: integer("pain"),
    mood: text("mood"),
    energy: integer("energy"),
    flow: flowEnum("flow"),
    comfortActions: text("comfort_actions").array().notNull().default([]),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("bloom_journal_user_date_idx").on(table.userId, table.recordedOn)],
);

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
