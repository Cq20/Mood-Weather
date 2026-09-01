import { Router, type Response } from "express";
import { eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  createSession,
  destroySession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "../lib/session";
import { requireAuth } from "../middlewares/auth";

const router = Router();

/** 认证端点独立限流：防暴力破解 / 撞库 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "尝试过于频繁，请 15 分钟后再试。" },
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("邮箱格式不正确").max(254),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .max(128, "密码过长"),
  displayName: z.string().trim().min(1).max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("邮箱格式不正确").max(254),
  password: z.string().min(1).max(128),
});

function setSessionCookie(res: Response, sessionId: string) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

function publicUser(user: { id: string; email: string; displayName: string | null }) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "参数校验失败", details: parsed.error.flatten() });
    }
    const { email, password, displayName } = parsed.data;

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "该邮箱已被注册" });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({ email, passwordHash, displayName: displayName ?? null })
      .returning({ id: usersTable.id, email: usersTable.email, displayName: usersTable.displayName });

    const session = await createSession(user.id);
    setSessionCookie(res, session.id);

    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "参数校验失败", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        passwordHash: usersTable.passwordHash,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    // 用户不存在与密码错误返回同一提示，避免账号枚举
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "邮箱或密码错误" });
    }

    const session = await createSession(user.id);
    setSessionCookie(res, session.id);

    return res.json({
      user: publicUser({ id: user.id, email: user.email, displayName: user.displayName }),
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const sessionId = (req.cookies as Record<string, string> | undefined)?.[
      SESSION_COOKIE_NAME
    ];

    if (sessionId) {
      try {
        await destroySession(sessionId);
      } catch {
        // 会话销毁失败不阻塞登出：清除 cookie 即可
      }
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);
    if (!user) {
      return res.status(401).json({ error: "用户不存在" });
    }
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

export default router;
