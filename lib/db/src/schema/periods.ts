import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { bloomProfilesTable } from "./profiles";

export const flowEnum = pgEnum("bloom_flow", ["spotting", "light", "medium", "heavy"]);

export const periodsTable = pgTable(
  "bloom_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => bloomProfilesTable.clerkUserId, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    flow: flowEnum("flow"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("bloom_period_user_start_unique").on(table.userId, table.startDate),
    index("bloom_period_user_start_idx").on(table.userId, table.startDate),
    check(
      "bloom_period_valid_range",
      sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);

export const insertPeriodSchema = createInsertSchema(periodsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPeriod = z.infer<typeof insertPeriodSchema>;
export type Period = typeof periodsTable.$inferSelect;
