import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 连接池调优：多用户场景下 max 需与数据库实例规格匹配
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// 空闲连接被数据库回收等场景下的错误不能静默丢失
pool.on("error", (err) => {
  console.error("[db] PostgreSQL pool error:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
