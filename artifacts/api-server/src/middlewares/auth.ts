import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE_NAME, validateSession } from "../lib/session";

declare module "express-serve-static-core" {
  interface Request {
    /** 由 requireAuth 注入的当前用户 id */
    userId?: string;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const sessionId = (req.cookies as Record<string, string> | undefined)?.[
      SESSION_COOKIE_NAME
    ];

    if (!sessionId) {
      return res.status(401).json({ error: "未登录" });
    }

    const session = await validateSession(sessionId);
    if (!session) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.status(401).json({ error: "登录已过期，请重新登录" });
    }

    req.userId = session.userId;
    return next();
  } catch (err) {
    return next(err);
  }
}
