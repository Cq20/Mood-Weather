const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

/**
 * 解析允许的前端源（CORS 白名单与 CSRF 同源校验共用）。
 * 通过环境变量 CORS_ORIGINS 配置（逗号分隔的显式域名），
 * 不使用通配符——cors 包对字符串做精确匹配，通配符会被按字面量处理。
 */
export function resolveAllowedOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_CORS_ORIGINS, ...fromEnv])];
}

const allowedOriginSet = (): Set<string> => new Set(resolveAllowedOrigins());

/**
 * CSRF 防护：所有写操作（POST/PUT/PATCH/DELETE）要求请求的 Origin
 * 属于白名单。配合 SameSite=Lax 的 Cookie，双重防线。
 * 无 Origin 头（同源导航/命令行客户端）默认放行。
 */
export function sameOriginOnly(req: {
  method: string;
  headers: { origin?: string };
}) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const origin = req.headers.origin;
  if (!origin) return { ok: true };

  if (allowedOriginSet().has(origin)) return { ok: true };

  return { ok: false, reason: "跨站请求被拒绝" };
}
