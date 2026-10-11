/**
 * Seeds ONE clearly-identified demo account.
 * demo@bloom.app / BloomDemo2026
 * Run: node scripts/seed.mjs   (requires DATABASE_URL)
 */
import pg from "pg";

const DEMO_EMAIL = "demo@bloom.app";
const DEMO_PASSWORD = "BloomDemo2026";
const KEYLEN = 64;

function scryptSync(password, salt, keylen) {
  return new Promise((resolve, reject) => {
    const { scrypt } = require("node:crypto");
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

function today(offset = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "") ? false : { rejectUnauthorized: false },
});

async function main() {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [DEMO_EMAIL]);
  if (existing.rows.length) {
    console.log("Demo account already exists — nothing to do.");
    return;
  }
  const salt = "bloom-demo-salt-hex-000000";
  const hash = await scryptSync(DEMO_PASSWORD, salt, KEYLEN);
  const user = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, timezone, email_verified_at)
     VALUES ($1, $2, $3, 'UTC', now()) RETURNING id`,
    [DEMO_EMAIL, `${salt}:${hash.toString("hex")}`, "Demo Bloom"],
  );
  const userId = user.rows[0].id;

  for (const start of [today(-91), today(-63), today(-34)]) {
    await pool.query(
      `INSERT INTO periods (user_id, start_date, end_date, flow) VALUES ($1, $2, $3, 'medium')`,
      [userId, start, today(new Date(start).getUTCDate() && 0) && start],
    );
  }
  console.log("Seeded demo account: demo@bloom.app (password BloomDemo2026)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => pool.end());
