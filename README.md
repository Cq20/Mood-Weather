# MoodWeather · 情绪天气

> 把"今天心情怎么样"这道主观题，变成可记录、可回看、可带走的数据——用三种不同的表达入口，适配不同状态下的你。

MoodWeather 是一个情绪记录与自我关怀的全栈 Web 应用：用**调色盘绘画、粉碎机宣泄、气泡速记**三种方式记录情绪，配合天气锚点与洞察卡片，让情绪从单点的主观感受变成可观察的纵向轨迹。

---

## 功能

### 三种情绪记录入口

不同情绪状态下的人，需要不同的表达方式——所以没有只做一种"打卡"：

| 入口 | 交互 | 适合的时刻 |
|---|---|---|
| 🎨 **调色盘** | 选择笔刷在画布上作画——"炸裂"是向外飞溅的粒子（愤怒），"晕染"是缓慢扩散的水墨（忧郁），"丝滑"是柔和流动的弧线（平静） | 想细粒度表达、愿意沉淀的时候 |
| 🗑️ **粉碎机** | 选中当下的情绪，把写满它的问题纸条粉碎，并获得一段针对性的疗愈语 | 情绪浓度高、需要释放出口的时候 |
| 🫧 **气泡** | 在情境场景里选一颗气泡，轻量记下此刻感受 | 手头忙、只想快速记一笔的时候 |

### 洞察卡片

单次记录是主观的，**纵向趋势是客观的**：连续记录天数（streak）、记录量与情绪的周环比，让"这周好像状态不太好"变成看得见的曲线。

### 天气锚点

44 个城市的实时天气驱动首页背景与天气-情绪建议。外部情境是情绪自评的天然参照系：阴雨天情绪低落不一定是问题，有了锚点才分得清。

### 隐私与数据主权

情绪记录、绘画与日记属于**敏感个人信息**，产品机制上直接落地：

- 未登录时数据仅保存在本机浏览器，登录后明示才同步
- `/privacy` 页随时**导出我的数据**（JSON 下载）
- **删除账号**即彻底清除数据，回归未登录状态
- 首次访问展示隐私同意横幅，同意后记住选择

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite · React 18 · TypeScript · Tailwind CSS · shadcn/ui |
| 后端 | Node.js · Express 5 · Zod（请求校验）· Drizzle ORM |
| 数据库 | PostgreSQL 16+（users / sessions / mood_events / journal_entries 四表，含索引与外键） |
| 安全 | helmet · express-rate-limit · cookie 会话 |
| 工程 | pnpm monorepo（api-server / moodweather / db / api-client-react / api-zod 共享契约）· Vitest · Docker Compose |

前后端通过共享的 Zod schema 契约（`@workspace/api-zod`）保持类型一致。

---

## 快速开始

### 1. 启动数据库（Docker）

```bash
docker compose up -d
# 等待容器 healthy：docker compose ps
# 地址 localhost:5432 · 用户/密码 postgres/postgres · 库名 moodweather
```

### 2. 数据库迁移

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/moodweather
pnpm --filter db migrate
```

### 3. 启动后端

```bash
cd artifacts/api-server
DATABASE_URL=postgres://postgres:postgres@localhost:5432/moodweather PORT=3000 node ./dist/index.mjs
# 健康检查：{"status":"ok","db":"ok"}
```

### 4. 启动前端

```bash
cd artifacts/moodweather
pnpm dev   # http://localhost:5173，/api 代理到 3000
```

### 5. 全链路验证

注册 → 登录 → 情绪事件（调色盘/粉碎机/气泡）→ 日记 → 数据导出 → 删除账号，详见 `docs/LOCAL_DB.md`。

---

## 路线图

- **P1（当前）**：三种情绪入口 + 洞察卡片 + 隐私机制 + 在线 demo
- **P2（规划）**：差异化与留存——洞察卡片的个性化深度、记录习惯的提醒策略、导出格式的富化

---

## License

MIT
