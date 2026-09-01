import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, sessionsTable } from "@workspace/db";

export const SESSION_COOKIE_NAME = "mood_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

export async function createSession(userId: string) {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

/** 校验 session：存在且未过期；过期会话顺手清理 */
export async function validateSession(id: string) {
  const rows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, id), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function destroySession(id: string) {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
}
