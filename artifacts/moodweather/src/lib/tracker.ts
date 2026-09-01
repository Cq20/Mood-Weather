const STORAGE_KEY = "moodweather_events_v1";

/** 气泡关系：角色名 + 归一化距离（0=最近，1=最远） */
export type BubbleRole = { label: string; distance: number };

export type TrackerEvent =
  | {
      type: "palette";
      ts: number;
      dominantColor?: string;
      dominantLabel?: string;
      ratio?: number;
    }
  | {
      type: "shredder";
      ts: number;
      emotion?: string;
      length: number;
      /** 烦恼正文（敏感内容，登录后随云端同步，用户可一键销毁） */
      content: string;
    }
  | {
      type: "bubble";
      ts: number;
      scene: string;
      rolesCount: number;
      /** 各角色的关系距离，用于后续对比变化 */
      roles?: BubbleRole[];
    };

/** 远程同步钩子：由认证层注入（登录时上报服务端） */
let remoteSync: ((event: TrackerEvent) => void) | null = null;

export function setRemoteSync(fn: ((event: TrackerEvent) => void) | null) {
  remoteSync = fn;
}

export function loadEvents(): TrackerEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackerEvent[]) : [];
  } catch {
    return [];
  }
}

export function recordEvent(event: TrackerEvent) {
  if (typeof window === "undefined") return;

  // 本地记录始终保留（离线兜底）
  try {
    const events = loadEvents();
    events.push(event);
    const trimmed = events.slice(-500);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage failures
  }

  // 登录状态下同步到服务端（fire-and-forget，失败不影响本地）
  try {
    remoteSync?.(event);
  } catch {
    // ignore sync failures
  }
}

export function clearEvents() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function dateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shortDateLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function last7DayKeys(now = Date.now()): { key: string; label: string; ts: number }[] {
  const result: { key: string; label: string; ts: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const ts = now - i * 24 * 60 * 60 * 1000;
    result.push({ key: dateKey(ts), label: shortDateLabel(ts), ts });
  }
  return result;
}
