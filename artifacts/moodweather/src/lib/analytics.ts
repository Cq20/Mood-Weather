const STORAGE_KEY = "moodweather_analytics_v1";
const MAX_EVENTS = 500;

export type AnalyticsEvent = {
  name: string;
  ts: number;
  props?: Record<string, unknown>;
};

/**
 * 最小埋点：本地采集 + console.debug 输出。
 * 未来接入真实分析 SDK 时，只需在 track() 内追加上报调用。
 */
export function track(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const event: AnalyticsEvent = {
    name,
    ts: Date.now(),
    ...(props ? { props } : {}),
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown[] = raw ? JSON.parse(raw) : [];
    const events = Array.isArray(parsed) ? parsed : [];
    events.push(event);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_EVENTS)),
    );
  } catch {
    // 存储失败不影响功能
  }

  if (import.meta.env.DEV) {
    console.debug("[analytics]", name, props ?? "");
  }
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}
