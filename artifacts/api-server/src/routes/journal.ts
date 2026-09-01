import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, journalEntriesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

const MAX_CONTENT_LENGTH = 2000;

const createEntrySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "内容不能为空")
    .max(MAX_CONTENT_LENGTH, `内容过长（最多 ${MAX_CONTENT_LENGTH} 字）`),
  moodLabel: z.string().trim().min(1).max(20).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid("无效的日记 ID"),
});

// GET /api/journal-entries → 当前用户全部日记（倒序）
router.get("/", async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: journalEntriesTable.id,
        content: journalEntriesTable.content,
        moodLabel: journalEntriesTable.moodLabel,
        createdAt: journalEntriesTable.createdAt,
        updatedAt: journalEntriesTable.updatedAt,
      })
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.userId, req.userId!))
      .orderBy(desc(journalEntriesTable.createdAt))
      .limit(200);

    return res.json({
      entries: rows.map((row) => ({
        id: row.id,
        content: row.content,
        moodLabel: row.moodLabel,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/journal-entries → 新增一条日记
router.post("/", async (req, res, next) => {
  try {
    const parsed = createEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "参数校验失败", details: parsed.error.flatten() });
    }

    const [created] = await db
      .insert(journalEntriesTable)
      .values({
        userId: req.userId!,
        content: parsed.data.content,
        moodLabel: parsed.data.moodLabel ?? null,
      })
      .returning({
        id: journalEntriesTable.id,
        content: journalEntriesTable.content,
        moodLabel: journalEntriesTable.moodLabel,
        createdAt: journalEntriesTable.createdAt,
        updatedAt: journalEntriesTable.updatedAt,
      });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/journal-entries/:id → 删除一条日记（仅本人）
router.delete("/:id", async (req, res, next) => {
  try {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: "无效的日记 ID" });
    }

    const deleted = await db
      .delete(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.id, parsed.data.id),
          eq(journalEntriesTable.userId, req.userId!),
        ),
      )
      .returning({ id: journalEntriesTable.id });

    if (deleted.length === 0) {
      return res.status(404).json({ error: "日记不存在" });
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
