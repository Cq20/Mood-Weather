import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "./app";

// 无真实数据库：验证错误路径与安全中间件行为
describe("API 应用（无 DB 环境）", () => {
  it("未匹配路由 → 404 JSON", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not Found" });
  });

  it("健康检查在 DB 不可达时 → 503 degraded", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "degraded", db: "unreachable" });
  });

  it("天气缺少参数 → 400", async () => {
    const res = await request(app).get("/api/weather");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("天气未知城市 → 404", async () => {
    const res = await request(app).get("/api/weather?city=不存在的城市");
    expect(res.status).toBe(404);
  });

  it("CSRF：写操作跨源 → 403", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example.com")
      .send({ email: "a@b.com", password: "x" });
    expect(res.status).toBe(403);
  });

  it("注册非法请求体 → 400 zod 详情", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bad", password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it("未登录访问 /auth/me → 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("安全响应头存在（helmet）", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
  });

  it("全局限流响应格式为 JSON（不泄漏 HTML）", async () => {
    // 触发限流：快速连续请求 60s 窗口内超过 120 次
    const results = [];
    for (let i = 0; i < 130; i += 1) {
      results.push(await request(app).get("/api/health"));
    }
    const limited = results.slice(-1)[0];
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBeDefined();
  });
});
