# 本地数据库与全链路验证指南

MoodWeather 的认证、情绪记录、日记、数据导出/删除均依赖 PostgreSQL。本指南说明如何在本地（或任意 Linux/macOS/Windows + Docker 环境）拉起数据库并验证完整链路。

## 1. 启动数据库（推荐 Docker）

```bash
docker compose up -d
```

等待容器健康（`docker compose ps` 显示 healthy）后，数据库信息：

| 项 | 值 |
|---|---|
| 地址 | `localhost:5432` |
| 用户 / 密码 | `postgres` / `postgres` |
| 数据库 | `moodweather` |

> 没有 Docker 时，也可以安装 PostgreSQL 16+，创建同名用户/密码/数据库即可。

## 2. 执行数据库迁移

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/moodweather
pnpm --filter db migrate
```

迁移会创建 4 张表：`users` / `sessions` / `mood_events` / `journal_entries`（含索引与外键）。

## 3. 启动后端

```bash
cd artifacts/api-server
DATABASE_URL=postgres://postgres:postgres@localhost:5432/moodweather PORT=3000 node ./dist/index.mjs
```

健康检查应返回 `{"status":"ok","db":"ok"}`（此前无库时为 503 degraded）。

## 4. 启动前端（开发模式）

```bash
cd artifacts/moodweather
pnpm dev   # 或 npx vite --config vite.config.ts --host 0.0.0.0
```

访问 http://localhost:5173，前端通过 vite 代理 `/api` → 3000。

## 5. 全链路验证清单

| 功能 | 操作 | 预期 |
|---|---|---|
| 注册 | 首页右上角"登录"→ 注册标签 | 201 + 自动登录 |
| 登录/登出 | 同上 | 200，cookie 会话 |
| 情绪事件 | 使用调色盘/粉碎机/气泡后到日记页 | 显示"已同步云端" |
| 日记 | 日记页写日记并保存 | 显示在"我的日记"，同步云端 |
| 数据导出 | /privacy 页"导出我的数据" | 下载 JSON 文件 |
| 数据删除 | /privacy 页"删除账号" | 数据清除，回到未登录 |
| 天气 | 首页切换城市（44 城） | 实时温度 |

## 6. 生产部署要点

- 后端设置 `DATABASE_URL`（生产库）、`CORS_ORIGINS`（前端域名白名单）、`TRUST_PROXY=true`（反代后）、`NODE_ENV=production`（secure cookie）。
- 前端 `VITE_API_URL` 指向服务根地址；或同域部署由反向代理转发 `/api`。
- 迁移用 `pnpm --filter db migrate`（勿用 push/push-force）。
