import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  LogIn,
  Palette as PaletteIcon,
  Wind,
  Users,
  Sparkles,
  Trash2,
  PenLine,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  clearEvents,
  dateKey,
  last7DayKeys,
  loadEvents,
  type TrackerEvent,
} from "@/lib/tracker";
import {
  deleteLocalJournal,
  loadLocalJournals,
  saveLocalJournal,
} from "@/lib/journals";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import AuthModal from "@/components/AuthModal";
import {
  MoodTrajectoryCard,
  MonthlySummaryCard,
  RelationInsight,
  StreakCard,
  WeatherMoodCard,
  WeeklyReportCard,
} from "@/components/InsightCards";
import { relationChanges } from "@/lib/insights";

const MAX_JOURNAL_LENGTH = 2000;

/** 日记统一视图（本地/云端同构） */
type JournalView = { id: string; content: string; createdAt: number };

const TYPE_LABEL: Record<TrackerEvent["type"], string> = {
  palette: "调色盘",
  shredder: "粉碎",
  bubble: "气泡",
};

const TYPE_COLOR: Record<TrackerEvent["type"], string> = {
  palette: "#4C9EE8",
  shredder: "#9B6CE8",
  bubble: "#FF9F45",
};

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function describeEvent(event: TrackerEvent): string {
  if (event.type === "palette") {
    if (event.dominantLabel && typeof event.ratio === "number") {
      return `主色 ${event.dominantLabel}（约 ${Math.round(event.ratio * 100)}%）`;
    }
    return "完成一次绘画";
  }
  if (event.type === "shredder") {
    const emo = event.emotion ? `「${event.emotion}」` : "情绪";
    const snippet =
      event.content && event.content.length > 0
        ? `：${event.content.slice(0, 24)}${event.content.length > 24 ? "…" : ""}`
        : "";
    return `粉碎了 ${event.length} 字的${emo}${snippet}`;
  }
  const sceneText = `${event.scene}场景，${event.rolesCount} 个关系`;
  if (event.roles && event.roles.length > 0) {
    const nearest = event.roles.reduce((a, b) =>
      a.distance < b.distance ? a : b,
    );
    return `${sceneText}，最近的是「${nearest.label}」`;
  }
  return sceneText;
}

export default function Journal() {
  const { user } = useAuth();
  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [tick, setTick] = useState(0);
  const [dataSource, setDataSource] = useState<"local" | "cloud">("local");
  const [journals, setJournals] = useState<JournalView[]>([]);
  const [journalSource, setJournalSource] = useState<"local" | "cloud">("local");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [showFreshTip, setShowFreshTip] = useState(
    () =>
      typeof window !== "undefined" &&
      window.location.search.includes("fresh=1"),
  );

  useEffect(() => {
    track("journal_view", { totalRecords: events.length });
  }, [events.length]);

  useEffect(() => {
    if (!showFreshTip) return;
    const timer = window.setTimeout(() => setShowFreshTip(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showFreshTip]);

  useEffect(() => {
    // 登录：优先读取云端记录；未登录/云端失败：回退本地
    if (!user) {
      setEvents(loadEvents());
      setDataSource("local");
      return;
    }

    let cancelled = false;
    api
      .listMoodEvents(7)
      .then((remote) => {
        if (cancelled) return;
        setEvents(
          remote.map((event) => ({
            type: event.type,
            ts: event.ts,
            ...(event.payload ? { ...(event.payload as object) } : {}),
          })) as TrackerEvent[],
        );
        setDataSource("cloud");
      })
      .catch(() => {
        if (cancelled) return;
        setEvents(loadEvents());
        setDataSource("local");
      });

    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  // 日记数据：登录读云端，未登录/失败读本地
  useEffect(() => {
    if (!user) {
      setJournals(
        loadLocalJournals().map((j) => ({
          id: j.id,
          content: j.content,
          createdAt: j.createdAt,
        })),
      );
      setJournalSource("local");
      return;
    }

    let cancelled = false;
    api
      .listJournalEntries()
      .then((entries) => {
        if (cancelled) return;
        setJournals(
          entries.map((entry) => ({
            id: entry.id,
            content: entry.content,
            createdAt: new Date(entry.createdAt).getTime(),
          })),
        );
        setJournalSource("cloud");
      })
      .catch(() => {
        if (cancelled) return;
        setJournals(
          loadLocalJournals().map((j) => ({
            id: j.id,
            content: j.content,
            createdAt: j.createdAt,
          })),
        );
        setJournalSource("local");
      });

    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  async function handleSaveJournal() {
    const content = draft.trim();
    if (!content || content.length > MAX_JOURNAL_LENGTH) return;
    setSaving(true);
    try {
      if (user) {
        try {
          await api.createJournalEntry(content);
        } catch {
          // 云端失败降级本地保存，不丢失内容
          saveLocalJournal(content);
        }
      } else {
        saveLocalJournal(content);
      }
      setDraft("");
      setTick((value) => value + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteJournal(id: string) {
    if (user && journalSource === "cloud") {
      try {
        await api.deleteJournalEntry(id);
      } catch {
        // 云端删除失败不阻塞：本地刷新后仍可见
      }
    } else {
      deleteLocalJournal(id);
    }
    setTick((value) => value + 1);
  }

  const days = useMemo(() => last7DayKeys(), []);
  const todayKey = days[days.length - 1]?.key;

  const eventsByDay = useMemo(() => {
    const map: Record<string, TrackerEvent[]> = {};
    for (const event of events) {
      const key = dateKey(event.ts);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  const todayEvents = eventsByDay[todayKey] ?? [];
  const todayCounts = useMemo(() => {
    const counts: Record<TrackerEvent["type"], number> = {
      palette: 0,
      shredder: 0,
      bubble: 0,
    };
    for (const event of todayEvents) {
      counts[event.type] += 1;
    }
    return counts;
  }, [todayEvents]);

  const relationDeltas = useMemo(() => relationChanges(events), [events]);

  const emotionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of events) {
      if (event.type !== "shredder") continue;
      const key = event.emotion ?? "未标注";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [events]);

  const colorStats = useMemo(() => {
    const counts: Record<string, { hex: string; count: number }> = {};
    for (const event of events) {
      if (event.type !== "palette" || !event.dominantLabel) continue;
      const key = event.dominantLabel;
      if (!counts[key]) {
        counts[key] = { hex: event.dominantColor ?? "#9CA3AF", count: 0 };
      }
      counts[key].count += 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [events]);

  const recent = useMemo(() => events.slice().reverse().slice(0, 12), [events]);

  const moodSummary = useMemo(() => {
    if (emotionStats.length === 0 && colorStats.length === 0) {
      return "记录还很少，去画一画、写一写吧。";
    }
    const topEmotion = emotionStats[0]?.[0];
    const topColor = colorStats[0]?.[0];
    if (topEmotion && topColor) {
      return `这段时间，你最常面对的情绪是「${topEmotion}」，画里出现最多的是${topColor}。`;
    }
    if (topEmotion) {
      return `这段时间，你最常面对的情绪是「${topEmotion}」。`;
    }
    if (topColor) {
      return `这段时间，你画里出现最多的是${topColor}。`;
    }
    return "继续记录，会看到更清晰的趋势。";
  }, [emotionStats, colorStats]);

  function handleClear() {
    if (typeof window === "undefined") return;
    const ok = window.confirm("确定清空所有记录吗？这不会影响功能本身。");
    if (!ok) return;
    clearEvents();
    if (user) {
      // 登录状态下同时清空云端记录（失败时本地已清，下次加载云端仍可见）
      void api.clearMoodEvents();
    }
    setTick((value) => value + 1);
  }

  return (
    <div
      className="min-h-[100dvh] w-full"
      style={{
        background:
          "linear-gradient(160deg,#fef3f0 0%,#f5ebff 45%,#e9f3ff 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-5 pb-10">
        <header className="flex items-center justify-between text-foreground/70">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white/55 px-3 py-1.5 text-sm backdrop-blur-md transition-colors hover:bg-white/75"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>返回</span>
          </Link>
          <div className="text-right">
            <div className="text-base font-medium tracking-wide text-foreground/80">心境日记</div>
            <div className="text-[11px] text-foreground/55">看看这些天，你都经过了什么</div>
          </div>
        </header>

        {showFreshTip ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700"
          >
            <Sparkles size={14} strokeWidth={1.8} />
            刚记录的内容已保存，它会汇入下面的趋势里。
          </motion.div>
        ) : null}

        <StreakCard events={events} />

        {!user && events.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-3xl border border-primary/15 bg-white/85 p-4 shadow-sm backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <LogIn size={15} strokeWidth={1.8} className="text-primary/80" />
              <span className="text-sm font-medium text-foreground/80">
                已记录 {events.length} 次
              </span>
              <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] text-foreground/50">
                仅保存在本机
              </span>
            </div>
            <p className="text-xs leading-6 text-foreground/60">
              登录后这些记录将永不丢失，可跨设备同步，并生成你的月度情绪报告。
              你的数据始终可导出、可一键删除。
            </p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-foreground/85 px-4 text-xs font-medium text-white transition-all duration-200 active:scale-[0.98]"
            >
              <LogIn size={14} strokeWidth={1.8} />
              登录 / 注册
            </button>
          </motion.div>
        ) : null}

        <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 text-foreground/75">
            <PenLine size={16} strokeWidth={1.8} />
            <h3 className="text-sm font-medium">写日记</h3>
            <span className="ml-auto text-[11px] text-foreground/45">
              {journalSource === "cloud" ? "将同步到云端" : "仅保存在本机"}
            </span>
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_JOURNAL_LENGTH}
            rows={3}
            placeholder="记录此刻的心情，或今天发生的事……"
            className="mt-3 w-full resize-none rounded-2xl border border-foreground/15 bg-white px-4 py-3 text-sm leading-relaxed text-foreground/85 outline-none placeholder:text-foreground/40 focus:border-primary/50"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-foreground/45">
              {draft.length}/{MAX_JOURNAL_LENGTH}
              {!user ? " · 未登录，日记仅存本机浏览器" : ""}
            </span>
            <button
              type="button"
              onClick={() => void handleSaveJournal()}
              disabled={saving || draft.trim().length === 0}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground/85 px-4 text-xs font-medium text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={13} strokeWidth={1.8} />
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 text-primary/80">
            <Sparkles size={16} strokeWidth={1.8} />
            <h3 className="text-sm font-medium">今天</h3>
            <span className="ml-auto text-[11px] text-foreground/45">
              {new Date().toLocaleDateString("zh-CN")}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(Object.keys(TYPE_LABEL) as TrackerEvent["type"][]).map((type) => (
              <div
                key={type}
                className="rounded-2xl border border-foreground/5 bg-white px-3 py-3 text-center"
              >
                <div
                  className="mx-auto mb-1 h-2 w-8 rounded-full"
                  style={{ backgroundColor: TYPE_COLOR[type] }}
                />
                <div className="text-xl font-medium text-foreground/80">
                  {todayCounts[type]}
                </div>
                <div className="text-[11px] text-foreground/55">{TYPE_LABEL[type]}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-6 text-foreground/65">{moodSummary}</p>
        </section>

        <WeatherMoodCard events={events} />

        <MoodTrajectoryCard events={events} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
            <h3 className="mb-3 text-sm font-medium text-foreground/75">情绪关键词</h3>
            {emotionStats.length === 0 ? (
              <p className="text-xs text-foreground/55">还没有标注过情绪。</p>
            ) : (
              <div className="space-y-2">
                {emotionStats.map(([label, count]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-14 text-xs text-foreground/65">{label}</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(count / emotionStats[0][1]) * 100}%`,
                        }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full bg-[#9B6CE8]"
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-foreground/55">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
            <h3 className="mb-3 text-sm font-medium text-foreground/75">颜色心境</h3>
            {colorStats.length === 0 ? (
              <p className="text-xs text-foreground/55">还没有调色盘记录。</p>
            ) : (
              <div className="space-y-2">
                {colorStats.map(([label, info]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-white"
                      style={{ backgroundColor: info.hex }}
                    />
                    <span className="w-12 text-xs text-foreground/65">{label}</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(info.count / colorStats[0][1].count) * 100}%`,
                        }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: info.hex }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-foreground/55">
                      {info.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <WeeklyReportCard events={events} />

        <RelationInsight changes={relationDeltas} />

        <MonthlySummaryCard events={events} />

        <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/75">最近记录</h3>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] ${
                  dataSource === "cloud"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-foreground/5 text-foreground/50"
                }`}
              >
                {dataSource === "cloud" ? "已同步云端" : "仅保存在本机"}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex min-h-8 items-center gap-1 rounded-full bg-foreground/5 px-2.5 text-[11px] text-foreground/55 transition-colors hover:bg-foreground/10"
              >
                <Trash2 size={12} strokeWidth={1.8} />
                清空
              </button>
            </div>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-foreground/55">还没有记录，去任意一个模块体验一下吧。</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((event, index) => {
                const Icon =
                  event.type === "palette"
                    ? PaletteIcon
                    : event.type === "shredder"
                      ? Wind
                      : Users;
                return (
                  <li
                    key={`${event.ts}-${index}`}
                    className="flex items-center gap-3 rounded-2xl border border-foreground/5 bg-white px-3 py-2"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: TYPE_COLOR[event.type] }}
                    >
                      <Icon size={14} strokeWidth={1.8} />
                    </span>
                    <div className="flex-1 text-xs text-foreground/70">
                      <div className="font-medium text-foreground/80">
                        {TYPE_LABEL[event.type]}
                      </div>
                      <div className="text-foreground/55">{describeEvent(event)}</div>
                    </div>
                    <span className="text-[11px] text-foreground/45">
                      {formatTime(event.ts)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/75">我的日记</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] ${
                journalSource === "cloud"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-foreground/5 text-foreground/50"
              }`}
            >
              {journalSource === "cloud" ? "已同步云端" : "仅保存在本机"}
            </span>
          </div>
          {journals.length === 0 ? (
            <p className="text-xs text-foreground/55">
              还没有日记。写下一篇，记录此刻的心情吧。
            </p>
          ) : (
            <ul className="space-y-2">
              {journals.map((journal) => (
                <li
                  key={journal.id}
                  className="group rounded-2xl border border-foreground/5 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">
                      {journal.content}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleDeleteJournal(journal.id)}
                      className="mt-0.5 shrink-0 rounded-full bg-foreground/5 p-1.5 text-foreground/45 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="删除这条日记"
                    >
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="mt-1.5 text-[11px] text-foreground/45">
                    {formatTime(journal.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
