import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Palette as PaletteIcon,
  Wind,
  Users,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  clearEvents,
  dateKey,
  last7DayKeys,
  loadEvents,
  type TrackerEvent,
} from "@/lib/tracker";

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
    return `粉碎了 ${event.length} 字的${emo}`;
  }
  return `${event.scene}场景，${event.rolesCount} 个关系`;
}

export default function Journal() {
  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setEvents(loadEvents());
  }, [tick]);

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

  const trend = useMemo(
    () =>
      days.map(({ key, label }) => {
        const entries = eventsByDay[key] ?? [];
        const counts: Record<TrackerEvent["type"], number> = {
          palette: 0,
          shredder: 0,
          bubble: 0,
        };
        for (const event of entries) {
          counts[event.type] += 1;
        }
        return { key, label, counts, total: entries.length };
      }),
    [days, eventsByDay],
  );

  const maxDayTotal = useMemo(
    () => Math.max(1, ...trend.map((day) => day.total)),
    [trend],
  );

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

        <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
          <h3 className="mb-3 text-sm font-medium text-foreground/75">7 天趋势</h3>
          <div className="space-y-2">
            {trend.map((day) => (
              <div key={day.key} className="flex items-center gap-2">
                <span className="w-10 text-xs text-foreground/55">{day.label}</span>
                <div className="relative flex h-3 flex-1 overflow-hidden rounded-full bg-foreground/5">
                  {(Object.keys(TYPE_LABEL) as TrackerEvent["type"][]).map((type) => {
                    const ratio = day.counts[type] / maxDayTotal;
                    if (ratio === 0) return null;
                    return (
                      <motion.div
                        key={type}
                        initial={{ width: 0 }}
                        animate={{ width: `${ratio * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full"
                        style={{ backgroundColor: TYPE_COLOR[type] }}
                      />
                    );
                  })}
                </div>
                <span className="w-6 text-right text-xs text-foreground/55">{day.total}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 text-[11px] text-foreground/55">
            {(Object.keys(TYPE_LABEL) as TrackerEvent["type"][]).map((type) => (
              <span key={type} className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: TYPE_COLOR[type] }}
                />
                {TYPE_LABEL[type]}
              </span>
            ))}
          </div>
        </section>

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

        <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/75">最近记录</h3>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-h-8 items-center gap-1 rounded-full bg-foreground/5 px-2.5 text-[11px] text-foreground/55 transition-colors hover:bg-foreground/10"
            >
              <Trash2 size={12} strokeWidth={1.8} />
              清空
            </button>
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
      </div>
    </div>
  );
}
