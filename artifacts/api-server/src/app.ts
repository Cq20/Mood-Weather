import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { resolveAllowedOrigins, sameOriginOnly } from "./lib/cors";

const app: Express = express();

// 部署在反向代理/负载均衡之后时，必须开启以获得真实客户端 IP（限流与审计依赖）。
// 仅在生产环境显式开启，避免本地直接访问时被伪造 X-Forwarded-For 绕过限流。
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// 安全响应头：CSP / X-Content-Type-Options / HSTS 等
app.use(helmet());

// 跨域：显式域名白名单 + 携带凭证
app.use(
  cors({
    origin: resolveAllowedOrigins(),
    credentials: true,
  }),
);

// CSRF 防护：写操作校验 Origin 属于白名单（配合 SameSite=Lax Cookie）
app.use((req, res, next) => {
  const check = sameOriginOnly(req);
  if (!check.ok) {
    return res.status(403).json({ error: check.reason });
  }
  return next();
});

// 全局速率限制（防爬虫与资源耗尽）
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "请求过于频繁，请稍后再试。" },
  }),
);

app.use(cookieParser());

// 请求体：仅 JSON，上限 100kb（拒绝超大请求体）
app.use(express.json({ limit: "100kb" }));

app.use("/api", router);

// 统一 404（JSON 错误体，替代 Express 默认 HTML 页）
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// 统一 500 处理（避免向客户端泄露堆栈）
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
