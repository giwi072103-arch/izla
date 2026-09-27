import pg from "pg";
import { readFile } from "node:fs/promises";
export async function database() {
  let pool;
  if (process.env.DATABASE_URL)
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: true }
          : undefined,
    });
  else if (process.env.NODE_ENV !== "production") {
    const { newDb } = await import("pg-mem");
    const m = newDb();
    pool = new (m.adapters.createPg().Pool)();
  } else throw new Error("DATABASE_URL is required");
  await pool.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  return pool;
}
