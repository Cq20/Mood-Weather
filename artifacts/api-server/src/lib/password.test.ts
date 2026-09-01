import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("往返校验通过：正确密码返回 true", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    await expect(verifyPassword("correct-horse-battery", hash)).resolves.toBe(
      true,
    );
  });

  it("错误密码返回 false", async () => {
    const hash = await hashPassword("secret-1");
    await expect(verifyPassword("secret-2", hash)).resolves.toBe(false);
  });

  it("相同密码每次生成不同盐（不可预测性）", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("损坏的存储串返回 false 而非抛异常", async () => {
    await expect(verifyPassword("x", "not-a-valid-hash")).resolves.toBe(false);
    await expect(verifyPassword("x", "bcrypt:aaaa:bbbb")).resolves.toBe(false);
    await expect(verifyPassword("x", "")).resolves.toBe(false);
  });
});
