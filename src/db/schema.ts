import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const flowEnum = pgEnum("flow", ["spotting", "light", "medium", "heavy"]);
export const pairingStatusEnum = pgEnum("pairing_status", ["pending", "active", "revoked", "disconnected"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);
export const notificationKindEnum = pgEnum("notification_kind", [
  "period_upcoming",
  "craving_hint",
  "invitation",
  "checklist",
  "supplies",
  "system",
]);

export type NotificationKind = (typeof notificationKindEnum.enumValues)[number];
export type PermissionFlags = {
  periodEstimates: boolean;
  cravings: boolean;
  symptoms: boolean;
  carePreferences: boolean;
};

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  theme: text("theme").notNull().default("system"), // light | dark | system
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email_unique").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
  index("sessions_user_idx").on(t.userId),
]);

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // email_verify | password_reset
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("auth_tokens_hash_unique").on(t.tokenHash), index("auth_tokens_user_idx").on(t.userId)]);

// ---------------------------------------------------------------------------
// Cycle tracking
// ---------------------------------------------------------------------------
export const periods = pgTable("periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  flow: flowEnum("flow"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("periods_user_start_unique").on(t.userId, t.startDate),
  index("periods_user_start_idx").on(t.userId, t.startDate),
  check("periods_valid_range", sql`${t.endDate} is null or ${t.endDate} >= ${t.startDate}`),
]);

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recordedOn: date("recorded_on").notNull(),
  symptoms: text("symptoms").array().notNull().default(sql`'{}'::text[]`),
  pain: integer("pain"), // 0-10, nullable
  mood: text("mood"),
  energy: integer("energy"), // 0-10, nullable
  flow: flowEnum("flow"),
  comfortActions: text("comfort_actions").array().notNull().default(sql`'{}'::text[]`),
  comfortHelped: boolean("comfort_helped"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("journal_user_date_unique").on(t.userId, t.recordedOn),
  check("journal_pain_range", sql`${t.pain} is null or (${t.pain} >= 0 and ${t.pain} <= 10)`),
  check("journal_energy_range", sql`${t.energy} is null or (${t.energy} >= 0 and ${t.energy} <= 10)`),
]);

// ---------------------------------------------------------------------------
// Cravings & comfort profile
// ---------------------------------------------------------------------------
export const cravings = pgTable("cravings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  category: text("category").notNull().default("snack"), // snack | drink | comfort | surprise | other
  shareWithPartner: boolean("share_with_partner").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("cravings_user_idx").on(t.userId)]);

export const comfortProfile = pgTable("comfort_profile", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  favoriteSnacks: text("favorite_snacks").array().notNull().default(sql`'{}'::text[]`),
  favoriteDrinks: text("favorite_drinks").array().notNull().default(sql`'{}'::text[]`),
  comfortFoods: text("comfort_foods").array().notNull().default(sql`'{}'::text[]`),
  flowersOrSurprises: text("flowers_or_surprises").array().notNull().default(sql`'{}'::text[]`),
  comfortActivities: text("comfort_activities").array().notNull().default(sql`'{}'::text[]`),
  dislikes: text("dislikes").array().notNull().default(sql`'{}'::text[]`),
  dietaryRestrictions: text("dietary_restrictions").array().notNull().default(sql`'{}'::text[]`),
  allergies: text("allergies").array().notNull().default(sql`'{}'::text[]`),
  preferredSupport: text("preferred_support"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Trusted-person pairing
// ---------------------------------------------------------------------------
export const pairings = pgTable("pairings", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: pairingStatusEnum("status").notNull().default("pending"),
  // Granular, revocable grants. Deny by default for every category.
  permissions: jsonb("permissions").$type<PermissionFlags>().notNull().default(
    sql`'{"periodEstimates":false,"cravings":false,"symptoms":false,"carePreferences":false}'::jsonb`,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pairings_owner_idx").on(t.ownerId),
  index("pairings_partner_idx").on(t.partnerId),
  check("pairings_not_self", sql`${t.ownerId} <> ${t.partnerId}`),
]);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  message: text("message"),
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("invitations_token_hash_unique").on(t.tokenHash),
  index("invitations_owner_idx").on(t.ownerId),
]);

// ---------------------------------------------------------------------------
// AI companion
// ---------------------------------------------------------------------------
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("conversations_user_idx").on(t.userId)]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("messages_conversation_idx").on(t.conversationId)]);

// ---------------------------------------------------------------------------
// Notifications & preferences
// ---------------------------------------------------------------------------
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: notificationKindEnum("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  dedupeKey: text("dedupe_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("notifications_dedupe_unique").on(t.dedupeKey),
  index("notifications_user_idx").on(t.userId),
]);

export const reminderPreferences = pgTable("reminder_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  periodReminderDaysBefore: integer("period_reminder_days_before").notNull().default(2),
  suppliesReminderEnabled: boolean("supplies_reminder_enabled").notNull().default(false),
  checklistReminderEnabled: boolean("checklist_reminder_enabled").notNull().default(false),
  emailEnabled: boolean("email_enabled").notNull().default(false),
  quietHoursStart: integer("quiet_hours_start").notNull().default(22), // hour 0-23
  quietHoursEnd: integer("quiet_hours_end").notNull().default(8),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Personal checklist (period prep & emergency kit). Private to the user.
export const checklistItems = pgTable("checklist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("prep"), // prep | emergency
  label: text("label").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("checklist_user_idx" ).on(t.userId)]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_events_user_idx").on(t.userId)]);

export type User = typeof users.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type Pairing = typeof pairings.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
