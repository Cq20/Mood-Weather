import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 无真实数据库环境的占位连接串：pool 惰性连接，仅在查询时失败
    env: {
      DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5432/nonexistent",
      NODE_ENV: "test",
    },
  },
});
