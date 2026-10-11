import nextEnv from "@next/env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required before starting Bloom");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 10_000,
    max: 1,
    ssl: local ? false : { rejectUnauthorized: false },
  });
  try {
    // Serialize migration runners when deployment instances overlap.
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock(728401)");
      try {
        await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
      } finally {
        await client.query("SELECT pg_advisory_unlock(728401)");
      }
    } finally {
      client.release();
    }
    console.log("Database migrations applied successfully.");
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  // Never log connection strings, credentials, queries, or user data.
  console.error("Database migration failed. Check DATABASE_URL, connectivity, and database permissions. Server startup stopped.");
  process.exitCode = 1;
});
