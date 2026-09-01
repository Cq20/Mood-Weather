const STORAGE_KEY = "moodweather_journals_v1";

export type LocalJournal = {
  id: string;
  content: string;
  /** 创建时间（毫秒时间戳） */
  createdAt: number;
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadLocalJournals(): LocalJournal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalJournal[]) : [];
  } catch {
    return [];
  }
}

function persist(journals: LocalJournal[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(journals.slice(0, 100)),
    );
  } catch {
    // 存储失败忽略
  }
}

/** 本地保存一条日记，返回其 id */
export function saveLocalJournal(content: string): string {
  const id = createId();
  const journal: LocalJournal = { id, content, createdAt: Date.now() };
  persist([journal, ...loadLocalJournals()]);
  return id;
}

export function deleteLocalJournal(id: string) {
  persist(loadLocalJournals().filter((j) => j.id !== id));
}
