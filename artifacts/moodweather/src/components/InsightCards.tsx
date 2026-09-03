import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  CloudRain,
  Flame,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import type { TrackerEvent } from "@/lib/tracker";
import {
  analyzeWeatherMood,
  buildMonthlySummary,
  buildWeeklyReport,
  computeStreak,
  emotionWeekOverWeek,
  moodTrajectory,
  streakMessage,
  weatherInsightGap,
  weekOverWeek,
  type TrajectoryPoint,
} from "@/lib/insights";

const CARD = "rounded-3xl border border-white/60 bg-white/85 p-4 shadow-md backdrop-blur-md";
const LABEL = "text-sm font-medium text-foreground/75";

/* ==========================================================================
 * P1-3 连续记录 streak（留存钩子，放在日记页最顶部）
 * ======================================================================== */

export function StreakCard({ events }: { events: TrackerEvent[] }) {
  const streak = useMemo(() => computeStreak(events), [events]);
  const week = useMemo(() => weekOverWeek(events), [events]);
  const emotionWeek = useMemo(() => emotionWeekOverWeek(events), [events]);

  if (events.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      <div className="flex items-center gap-2">
        <Flame
          size={16}
          strokeWidth={1.8}
          className={streak.current > 0 ? "text-orange-400" : "text-foreground/40"}
        />
        <h3 className={LABEL}>连续记录</h3>
        <span className="ml-auto text-[11px] text-foreground/45">
          最长 {streak.longest} 天
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-medium leading-none text-foreground/85">
          {streak.current}
        </span>
        <span className="pb-0.5 text-xs text-foreground/55">
          天{streak.todayDone ? " · 今天已记录" : ""}
        </span>
      </div>

      <p className="mt-2.5 text-xs leading-6 text-foreground/65">
        {streakMessage(streak)}
      </p>

      <div className="mt-3 space-y-1.5 border-t border-foreground/5 pt-3">
        <p className="text-xs leading-6 text-foreground/60">{week.text}</p>
        {emotionWeek ? (
          <p className="text-xs leading-6 text-foreground/60">{emotionWeek}</p>
        ) : null}
      </div>
    </motion.section>
  );
}

/* ==========================================================================
 * P1-1 天气 × 情绪关联（差异化核心）
 * ======================================================================== */

export function WeatherMoodCard({ events }: { events: TrackerEvent[] }) {
  const insight = useMemo(() => analyzeWeatherMood(events), [events]);
  const gap = useMemo(() => weatherInsightGap(events), [events]);

  // 没有洞察也没有缺口（用户已有足够样本但差异不显著）时不占位
  if (!insight && gap === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      <div className="flex items-center gap-2">
        <CloudRain size={16} strokeWidth={1.8} className="text-sky-500" />
        <h3 className={LABEL}>天气与你的情绪</h3>
        {insight ? (
          <span className="ml-auto rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] text-foreground/45">
            {insight.sampleSize} 次记录
            {insight.confidence === "low" ? " · 参考" : ""}
          </span>
        ) : null}
      </div>

      {insight ? (
        <>
          <p className="mt-3 text-sm leading-6 text-foreground/80">{insight.headline}</p>
          <p className="mt-1.5 text-xs leading-6 text-foreground/55">{insight.detail}</p>
          {insight.confidence === "low" ? (
            <p className="mt-2 text-[11px] leading-5 text-foreground/40">
              样本还不多，先作为参考，继续记录会越来越准。
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs leading-6 text-foreground/60">
          再记录 {gap} 次，就能看出天气和情绪之间有没有关联了。
          每次记录都会带上当时的天气。
        </p>
      )}
    </motion.section>
  );
}

/* ==========================================================================
 * P1-2 情绪转变轨迹（折线图）
 *
 * 画的是「情绪状态」= 1 - 压力值，越高代表越轻松；
 * 这样"变好"在视觉上是上升的，符合直觉。
 * ======================================================================== */

const CHART_W = 300;
const CHART_H = 88;
const CHART_PAD = 10;

function TrajectoryChart({ points }: { points: TrajectoryPoint[] }) {
  const segments = useMemo(() => {
    // 只连有数据的点，缺失的天数断开（不插值，避免编造情绪）
    const runs: { x: number; y: number }[][] = [];
    let current: { x: number; y: number }[] = [];

    points.forEach((point, index) => {
      if (point.stress === null) {
        if (current.length) runs.push(current);
        current = [];
        return;
      }
      const x = CHART_PAD + (index / (points.length - 1)) * (CHART_W - CHART_PAD * 2);
      const wellbeing = 1 - point.stress; // 越高越轻松
      const y =
        CHART_H - CHART_PAD - wellbeing * (CHART_H - CHART_PAD * 2);
      current.push({ x, y });
    });
    if (current.length) runs.push(current);
    return runs;
  }, [points]);

  const dots = segments.flat();
  if (dots.length < 2) {
    return (
      <p className="py-4 text-center text-xs text-foreground/50">
        还需要几天的记录，才能画出情绪的走向。
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="mt-2 h-24 w-full"
      role="img"
      aria-label="最近七天的情绪状态走向"
    >
      <defs>
        <linearGradient id="mood-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4C9EE8" />
          <stop offset="100%" stopColor="#9B6CE8" />
        </linearGradient>
      </defs>

      {/* 基线：中性位置 */}
      <line
        x1={CHART_PAD}
        y1={CHART_H / 2}
        x2={CHART_W - CHART_PAD}
        y2={CHART_H / 2}
        stroke="currentColor"
        className="text-foreground/10"
        strokeWidth={1}
        strokeDasharray="3 4"
      />

      {segments.map((run, index) => (
        <motion.polyline
          key={index}
          points={run.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="url(#mood-line)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}

      {dots.map((point, index) => (
        <motion.circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={3}
          fill="#ffffff"
          stroke="url(#mood-line)"
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 + index * 0.05 }}
        />
      ))}
    </svg>
  );
}

export function MoodTrajectoryCard({ events }: { events: TrackerEvent[] }) {
  const points = useMemo(() => moodTrajectory(events, 7), [events]);
  const valid = points.filter((p) => p.stress !== null);

  if (valid.length === 0) return null;

  const first = valid[0].stress ?? 0;
  const last = valid[valid.length - 1].stress ?? 0;
  const improving = last < first - 0.05;
  const worsening = last > first + 0.05;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      <div className="flex items-center gap-2">
        <Activity size={16} strokeWidth={1.8} className="text-violet-500" />
        <h3 className={LABEL}>情绪走向</h3>
        <span className="ml-auto text-[11px] text-foreground/45">最近 7 天</span>
      </div>

      <TrajectoryChart points={points} />

      <div className="flex justify-between px-1 text-[11px] text-foreground/45">
        {points.map((point) => (
          <span key={point.key}>{point.label}</span>
        ))}
      </div>

      <p className="mt-2 text-xs leading-6 text-foreground/60">
        {improving
          ? "整体在往上走，最近的你比前几天松快一些。"
          : worsening
            ? "最近几天有点沉，写下来本身就是在帮自己卸重。"
            : "这段时间比较平稳，起伏不大。"}
      </p>
      <p className="mt-1 text-[11px] text-foreground/40">
        线越高代表越轻松，虚线是中间位置。
      </p>
    </motion.section>
  );
}

/* ==========================================================================
 * P1-3 站内周报（不依赖推送权限，进入日记页即可见）
 * ======================================================================== */

export function WeeklyReportCard({ events }: { events: TrackerEvent[] }) {
  const report = useMemo(() => buildWeeklyReport(events), [events]);
  if (!report) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      <div className="flex items-center gap-2">
        <CalendarDays size={16} strokeWidth={1.8} className="text-emerald-500" />
        <h3 className={LABEL}>本周小结</h3>
        <span className="ml-auto text-[11px] text-foreground/45">
          {report.rangeLabel}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {report.highlights.map((line, index) => (
          <li key={index} className="flex gap-2 text-xs leading-6 text-foreground/65">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/25" />
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-foreground/5 pt-3 text-xs leading-6 text-foreground/70">
        {report.closing}
      </p>
    </motion.section>
  );
}

/* ==========================================================================
 * P1-2 月度总结（模板化 + 文案库，无需 LLM）
 * ======================================================================== */

export function MonthlySummaryCard({ events }: { events: TrackerEvent[] }) {
  const summary = useMemo(() => buildMonthlySummary(events), [events]);
  if (!summary) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white/90 to-violet-50/70 p-4 shadow-md backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} strokeWidth={1.8} className="text-violet-500" />
        <h3 className={LABEL}>{summary.monthLabel}小结</h3>
        <span className="ml-auto text-[11px] text-foreground/45">
          活跃 {summary.activeDays} 天
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {summary.lines.map((line, index) => (
          <p
            key={index}
            className={
              index === summary.lines.length - 1
                ? "text-xs leading-6 text-violet-700/80"
                : "text-xs leading-6 text-foreground/70"
            }
          >
            {line}
          </p>
        ))}
      </div>
    </motion.section>
  );
}

/* ==========================================================================
 * P1-4 关系变化（气泡模块的历史距离对比）
 * ======================================================================== */

export function RelationInsight({
  changes,
}: {
  changes: { label: string; delta: number; percent: number }[];
}) {
  if (changes.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={CARD}
    >
      <div className="flex items-center gap-2">
        <HeartHandshake size={16} strokeWidth={1.8} className="text-rose-400" />
        <h3 className={LABEL}>关系的变化</h3>
      </div>

      <ul className="mt-3 space-y-2">
        {changes.slice(0, 4).map((change) => {
          const closer = change.delta < 0;
          return (
            <li
              key={change.label}
              className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2"
            >
              <span className="flex-1 text-xs text-foreground/75">
                你和「{change.label}」的距离
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  closer
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {closer ? "近" : "远"}了 {Math.abs(Math.round(change.percent))}%
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 text-[11px] leading-5 text-foreground/45">
        对比的是你最近两次的记录。关系是会流动的，看到变化本身就是收获。
      </p>
    </motion.section>
  );
}
