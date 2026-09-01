import { afterEach, describe, expect, it } from "vitest";
import { resolveAllowedOrigins, sameOriginOnly } from "./cors";

const ORIGINAL = process.env.CORS_ORIGINS;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.CORS_ORIGINS;
  } else {
    process.env.CORS_ORIGINS = ORIGINAL;
  }
});

describe("resolveAllowedOrigins", () => {
  it("默认包含本地开发源", () => {
    delete process.env.CORS_ORIGINS;
    expect(resolveAllowedOrigins()).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  });

  it("环境变量按逗号拆分并去重", () => {
    process.env.CORS_ORIGINS =
      "https://a.example.com, https://b.example.com ,https://a.example.com";
    expect(resolveAllowedOrigins()).toContain("https://a.example.com");
    expect(resolveAllowedOrigins()).toContain("https://b.example.com");
    // 去重
    expect(
      resolveAllowedOrigins().filter((o) => o === "https://a.example.com"),
    ).toHaveLength(1);
  });
});

describe("sameOriginOnly（CSRF 防护）", () => {
  it("读方法（GET/HEAD/OPTIONS）一律放行", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        sameOriginOnly({ method, headers: { origin: "https://evil.example.com" } })
          .ok,
      ).toBe(true);
    }
  });

  it("写方法且 Origin 在白名单内 → 放行", () => {
    process.env.CORS_ORIGINS = "https://app.example.com";
    const result = sameOriginOnly({
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });
    expect(result.ok).toBe(true);
  });

  it("写方法且 Origin 不在白名单 → 拒绝", () => {
    process.env.CORS_ORIGINS = "https://app.example.com";
    const result = sameOriginOnly({
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    expect(result.ok).toBe(false);
  });

  it("写方法但无 Origin 头（同源导航/CLI）→ 放行", () => {
    const result = sameOriginOnly({ method: "POST", headers: {} });
    expect(result.ok).toBe(true);
  });

  it("小写方法名同样生效", () => {
    process.env.CORS_ORIGINS = "https://app.example.com";
    const result = sameOriginOnly({
      method: "delete",
      headers: { origin: "https://evil.example.com" },
    });
    expect(result.ok).toBe(false);
  });
});
