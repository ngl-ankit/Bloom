/**
 * Seeds ONE clearly-identified demo account.
 * demo@bloom.app / BloomDemo2026
 * Run: npm run seed   (requires DATABASE_URL; safe to run twice)
 */
import pg from "pg";
import { randomBytes, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt);

function day(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function plusDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "") ? false : { rejectUnauthorized: false },
});

async function main() {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", ["demo@bloom.app"]);
  if (existing.rows.length) {
    console.log("Demo account already exists — nothing to do.");
    return;
  }
  const user = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, timezone, email_verified_at)
     VALUES ($1, $2, $3, 'UTC', now()) RETURNING id`,
    ["demo@bloom.app", await hashPassword("BloomDemo2026"), "Demo Bloom"],
  );
  const userId = user.rows[0].id;

  // Three recent cycles (28/29 days apart), 5-day durations
  for (const start of [day(-91), day(-63), day(-34)]) {
    await pool.query(
      `INSERT INTO periods (user_id, start_date, end_date, flow) VALUES ($1, $2, $3, 'medium')`,
      [userId, start, plusDays(start, 4)],
    );
  }

  const entries = [
    { off: -91, symptoms: ["cramps", "fatigue"], pain: 6, mood: "tired", energy: 3, flow: "medium", helped: true, actions: ["Heating pad", "Chamomile tea"] },
    { off: -63, symptoms: ["cramps", "backache"], pain: 5, mood: "sensitive", energy: 4, flow: "medium", helped: true, actions: ["Heating pad"] },
    { off: -34, symptoms: ["cramps", "bloating"], pain: 6, mood: "irritable", energy: 3, flow: "medium", helped: true, actions: ["Warm bath", "Dark chocolate"] },
    { off: -20, symptoms: ["headache"], pain: 3, mood: "calm", energy: 6, flow: null, helped: null, actions: [] },
    { off: -10, symptoms: [], pain: 1, mood: "happy", energy: 8, flow: null, helped: null, actions: ["Evening walk"] },
  ];
  for (const e of entries) {
    await pool.query(
      `INSERT INTO journal_entries (user_id, recorded_on, symptoms, pain, mood, energy, flow, comfort_actions, comfort_helped, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
       ON CONFLICT (user_id, recorded_on) DO NOTHING`,
      [userId, day(e.off), e.symptoms, e.pain, e.mood, e.energy, e.flow, e.actions, e.helped],
    );
  }

  await pool.query(
    `INSERT INTO comfort_profile (user_id, favorite_snacks, favorite_drinks, comfort_foods, flowers_or_surprises, comfort_activities, dislikes, dietary_restrictions, allergies, preferred_support)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId,
      ["Dark chocolate", "Salted almonds"], ["Chamomile tea", "Hot cocoa"], ["Warm ramen", "Mac and cheese"],
      ["Tulips"], ["Heating pad", "Warm bath", "Rom-coms", "Evening walk"], ["Coffee at night"],
      [], ["Peanuts"], "Gentle check-ins and snacks, not advice unless I ask."],
  );

  await pool.query(
    `INSERT INTO reminder_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );

  console.log("Seeded demo account: demo@bloom.app (password BloomDemo2026)");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => pool.end());
