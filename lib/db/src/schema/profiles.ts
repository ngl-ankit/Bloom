import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const bloomProfilesTable = pgTable("bloom_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("UTC"),
  language: text("language").notNull().default("en"),
  averageCycleLength: integer("average_cycle_length"),
  averagePeriodLength: integer("average_period_length"),
  remindersEnabled: boolean("reminders_enabled").notNull().default(false),
  preferredSupport: text("preferred_support"),
  favoriteComforts: text("favorite_comforts").array().notNull().default([]),
  dietaryRestrictions: text("dietary_restrictions").array().notNull().default([]),
  allergies: text("allergies").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBloomProfileSchema = createInsertSchema(bloomProfilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertBloomProfile = z.infer<typeof insertBloomProfileSchema>;
export type BloomProfile = typeof bloomProfilesTable.$inferSelect;
