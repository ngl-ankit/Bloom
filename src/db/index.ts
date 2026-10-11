import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __bloomPool: Pool | undefined;
}

function createPool(): Pool {
  const url = getEnv().DATABASE_URL;
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  return new Pool({
    connectionString: url,
    max: isLocal ? 5 : 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

export const pool: Pool = globalThis.__bloomPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__bloomPool = pool;

export const db = drizzle(pool, { schema });
export * from "./schema";
