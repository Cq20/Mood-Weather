import {
  setBaseUrl,
  authLogin,
  authLogout,
  authMe,
  authRegister,
  getWeather,
  listMoodEvents,
  createMoodEvent,
  deleteMoodEvents,
  deleteMyAccount,
  exportMyData as fetchMyDataExport,
  listJournalEntries,
  createJournalEntry,
  deleteJournalEntry,
  type User,
  type MoodEvent,
  type JournalEntry,
} from "@workspace/api-client-react";

// 生成客户端请求路径自带 /api 前缀（orval baseUrl 配置），
// 这里只需注入【服务根地址】（如 http://localhost:3000），
// 未配置时保持相对路径 /api/xxx，由同源代理/反向代理转发。
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
setBaseUrl(API_BASE || null);

/** 跨域开发环境需要携带 Cookie；同源部署时同样安全 */
const CREDENTIALS: RequestInit = { credentials: "include" };

export const api = {
  async login(email: string, password: string): Promise<User> {
    const res = await authLogin({ email, password }, CREDENTIALS);
    return res.user;
  },

  async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<User> {
    const res = await authRegister(
      { email, password, displayName },
      CREDENTIALS,
    );
    return res.user;
  },

  async logout(): Promise<void> {
    await authLogout(CREDENTIALS);
  },

  /** 获取当前登录用户；未登录时返回 null */
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await authMe(CREDENTIALS);
      return res.user;
    } catch {
      return null;
    }
  },

  async getWeather(city: string) {
    const res = await getWeather({ city }, CREDENTIALS);
    // 响应结构校验：防止代理/网关返回的 HTML 或脏数据被当成合法天气
    if (
      !res ||
      typeof res !== "object" ||
      typeof (res as { temp?: unknown }).temp !== "number"
    ) {
      throw new Error("天气服务响应异常");
    }
    return res;
  },

  async listMoodEvents(days = 7): Promise<MoodEvent[]> {
    const res = await listMoodEvents({ days }, CREDENTIALS);
    return res.events;
  },

  async createMoodEvent(
    type: MoodEvent["type"],
    ts: number,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await createMoodEvent(
      { type, occurredAt: ts, ...(payload ? { payload } : {}) },
      CREDENTIALS,
    );
  },

  async clearMoodEvents(): Promise<void> {
    await deleteMoodEvents(CREDENTIALS);
  },

  /** 导出当前用户全部数据为 JSON 文件（Blob） */
  async exportMyData(): Promise<Blob> {
    const data = await fetchMyDataExport(CREDENTIALS);
    return new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
  },

  /** 删除当前用户账号（级联清除全部云端数据） */
  async deleteAccount(): Promise<void> {
    await deleteMyAccount(CREDENTIALS);
  },

  /** 获取当前用户的日记列表 */
  async listJournalEntries(): Promise<JournalEntry[]> {
    const res = await listJournalEntries(CREDENTIALS);
    return res.entries;
  },

  /** 新增一条日记 */
  async createJournalEntry(
    content: string,
    moodLabel?: string,
  ): Promise<JournalEntry> {
    return createJournalEntry(
      { content, ...(moodLabel ? { moodLabel } : {}) },
      CREDENTIALS,
    );
  },

  /** 删除一条日记 */
  async deleteJournalEntry(id: string): Promise<void> {
    await deleteJournalEntry(id, CREDENTIALS);
  },
};
