import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const passwordSchema = z.string().min(10, "Use at least 10 characters").max(200);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, "Tell us what to call you").max(80),
  timezone: z.string().max(64).default("UTC"),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });

export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates");

export const periodInputSchema = z
  .object({
    startDate: dateOnly,
    endDate: dateOnly.nullable().optional(),
    flow: z.enum(["spotting", "light", "medium", "heavy"]).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((p) => !p.endDate || p.endDate >= p.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  });

export const FLOW_VALUES = ["spotting", "light", "medium", "heavy"] as const;
export const SYMPTOM_VALUES = [
  "cramps", "headache", "bloating", "fatigue", "acne", "backache",
  "nausea", "breast_tenderness", "dizziness", "insomnia", "diarrhea", "constipation",
] as const;
export const MOOD_VALUES = [
  "happy", "calm", "sensitive", "sad", "anxious", "irritable", "angry", "energetic", "tired",
] as const;

export const journalInputSchema = z.object({
  recordedOn: dateOnly,
  symptoms: z.array(z.enum(SYMPTOM_VALUES)).max(24).default([]),
  pain: z.number().int().min(0).max(10).nullable().optional(),
  mood: z.enum(MOOD_VALUES).nullable().optional(),
  energy: z.number().int().min(0).max(10).nullable().optional(),
  flow: z.enum(FLOW_VALUES).nullable().optional(),
  comfortActions: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  comfortHelped: z.boolean().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const cravingsSchema = z.object({
  item: z.string().trim().min(1, "Name the craving").max(120),
  category: z.enum(["snack", "drink", "comfort", "surprise", "other"]).default("snack"),
  shareWithPartner: z.boolean().default(false),
});

export const comfortProfileSchema = z.object({
  favoriteSnacks: z.array(z.string().trim().max(120)).max(30).default([]),
  favoriteDrinks: z.array(z.string().trim().max(120)).max(30).default([]),
  comfortFoods: z.array(z.string().trim().max(120)).max(30).default([]),
  flowersOrSurprises: z.array(z.string().trim().max(120)).max(30).default([]),
  comfortActivities: z.array(z.string().trim().max(120)).max(30).default([]),
  dislikes: z.array(z.string().trim().max(120)).max(30).default([]),
  dietaryRestrictions: z.array(z.string().trim().max(120)).max(30).default([]),
  allergies: z.array(z.string().trim().max(120)).max(30).default([]),
  preferredSupport: z.string().trim().max(2000).nullable().optional(),
});

export const SHARE_CATEGORIES = ["periodEstimates", "cravings", "symptoms", "carePreferences"] as const;
export type ShareCategory = (typeof SHARE_CATEGORIES)[number];

export const permissionsSchema = z.object(
  Object.fromEntries(SHARE_CATEGORIES.map((c) => [c, z.boolean()])) as Record<
    ShareCategory,
    z.ZodBoolean
  >,
);

export const invitationSchema = z.object({
  email: emailSchema,
  message: z.string().trim().max(500).optional(),
});

export const aiChatSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1, "Write a message").max(4000),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  timezone: z.string().max(64).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  averageCycleLength: z.number().int().min(15).max(60).nullable().optional(),
  averagePeriodLength: z.number().int().min(1).max(14).nullable().optional(),
  remindersEnabled: z.boolean().optional(),
});

export const reminderPrefsSchema = z.object({
  periodReminderDaysBefore: z.number().int().min(0).max(7),
  suppliesReminderEnabled: z.boolean(),
  checklistReminderEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  quietHoursStart: z.number().int().min(0).max(23),
  quietHoursEnd: z.number().int().min(0).max(23),
});
