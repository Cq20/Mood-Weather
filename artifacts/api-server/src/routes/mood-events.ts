import { Router } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db, moodEventsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

const MOOD_EVENT_TYPES = ["palette", "shredder", "bubble"] as const;

const createEventSchema = z.object({
  type: z.enum(MOOD_EVENT_TYPES),
  // 客户端事件发生时间（毫秒时间戳），缺省用服务器时间
  occurredAt: z.coerce.number().int().positive().optional(),
  payload: z.record(z.unknown()).optional(),
});

// GET /api/mood-events?days=7  → 当前用户最近 N 天事件（倒序，最多 500 条）
router.get("/", async (req, res, next) => {
  try {
    const daysRaw = req.query.days;
    const days =
      typeof daysRaw === "string" && !Number.isNaN(Number(daysRaw))
        ? Math.min(Math.max(Number(daysRaw), 1), 90)
        : 7;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: moodEventsTable.id,
        type: moodEventsTable.type,
        occurredAt: moodEventsTable.occurredAt,
        payload: moodEventsTable.payload,
      })
      .from(moodEventsTable)
      .where(
        and(
          eq(moodEventsTable.userId, req.userId!),
          gte(moodEventsTable.occurredAt, since),
        ),
      )
      .orderBy(desc(moodEventsTable.occurredAt))
      .limit(500);

    return res.json({
      events: rows.map((row) => ({
        id: row.id,
        type: row.type,
        ts: new Date(row.occurredAt).getTime(),
        ...(row.payload ? { payload: row.payload } : {}),
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/mood-events → 记录一次情绪事件
router.post("/", async (req, res, next) => {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "参数校验失败", details: parsed.error.flatten() });
    }

    const { type, occurredAt, payload } = parsed.data;
    const [created] = await db
      .insert(moodEventsTable)
      .values({
        userId: req.userId!,
        type,
        occurredAt: new Date(occurredAt ?? Date.now()),
        payload: payload ?? null,
      })
      .returning({
        id: moodEventsTable.id,
        type: moodEventsTable.type,
        occurredAt: moodEventsTable.occurredAt,
        payload: moodEventsTable.payload,
      });

    return res.status(201).json({
      event: {
        id: created.id,
        type: created.type,
        ts: new Date(created.occurredAt).getTime(),
        ...(created.payload ? { payload: created.payload } : {}),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/mood-events → 清空当前用户全部事件
router.delete("/", async (req, res, next) => {
  try {
    await db
      .delete(moodEventsTable)
      .where(eq(moodEventsTable.userId, req.userId!));
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
