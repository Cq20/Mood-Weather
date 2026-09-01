import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("registerSchema", () => {
  it("合法输入通过（邮箱规范化、去空格）", () => {
    const result = registerSchema.safeParse({
      email: "  User@Example.COM ",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("非法邮箱拒绝", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("过短密码拒绝", () => {
    const result = registerSchema.safeParse({
      email: "a@b.com",
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("可选昵称合法", () => {
    const result = registerSchema.safeParse({
      email: "a@b.com",
      password: "password123",
      displayName: " 小明 ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBe("小明");
  });
});

describe("loginSchema", () => {
  it("合法登录输入通过", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "x" }).success,
    ).toBe(true);
  });

  it("非法邮箱拒绝", () => {
    expect(
      loginSchema.safeParse({ email: "bad", password: "x" }).success,
    ).toBe(false);
  });

  it("缺少字段拒绝", () => {
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });
});
