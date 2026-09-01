import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  journalEntriesTable,
  moodEventsTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// GET /api/me/export → 导出当前用户全部数据（账号 + 情绪事件 + 日记）
router.get("/export", async (req, res, next) => {
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "用户不存在" });
    }

    const [moodEvents, journalEntries] = await Promise.all([
      db
        .select({
          id: moodEventsTable.id,
          type: moodEventsTable.type,
          occurredAt: moodEventsTable.occurredAt,
          payload: moodEventsTable.payload,
        })
        .from(moodEventsTable)
        .where(eq(moodEventsTable.userId, req.userId!))
        .orderBy(asc(moodEventsTable.occurredAt)),
      db
        .select({
          id: journalEntriesTable.id,
          content: journalEntriesTable.content,
          moodLabel: journalEntriesTable.moodLabel,
          createdAt: journalEntriesTable.createdAt,
        })
        .from(journalEntriesTable)
        .where(eq(journalEntriesTable.userId, req.userId!))
        .orderBy(asc(journalEntriesTable.createdAt)),
    ]);

    return res.json({
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      moodEvents: moodEvents.map((event) => ({
        id: event.id,
        type: event.type,
        occurredAt: event.occurredAt,
        payload: event.payload,
      })),
      journalEntries,
    });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/me → 删除账号（sessions/mood_events/journal_entries 级联删除）
router.delete("/", async (req, res, next) => {
  try {
    // 显式清理会话与数据（外键为 ON DELETE CASCADE，此处双保险并清除会话）
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, req.userId!));
    await db
      .delete(usersTable)
      .where(eq(usersTable.id, req.userId!));

    res.clearCookie("mood_session", { path: "/" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
