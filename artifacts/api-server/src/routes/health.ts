import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

// GET /api/health — 健康检查（含数据库探活）
router.get("/", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", db: "ok" });
  } catch {
    // 数据库不可达时返回 503，供负载均衡/监控摘除实例
    return res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

export default router;
