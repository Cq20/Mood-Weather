const { defineConfig } = require("drizzle-kit");
const path = require("node:path");

// drizzle-kit generate 无需真实数据库连接；push/migrate 才需要。
// 本地无 DATABASE_URL 时使用占位符以便生成迁移文件，生产环境必须显式设置。
const url =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/moodweather";

module.exports = defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts").replace(/\\/g, "/"),
  dialect: "postgresql",
  out: path.join(__dirname, "./migrations"),
  dbCredentials: {
    url,
  },
});
