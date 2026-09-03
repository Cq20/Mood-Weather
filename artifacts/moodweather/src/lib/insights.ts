import { dateKey, shortDateLabel, type TrackerEvent } from "./tracker";

/* ============================================================================
 * 洞察计算引擎（纯函数，无副作用）
 *
 * 设计原则：
 * 1. 样本不足不硬凑 —— 宁可返回 null，也不给用户造成误导的"规律"
 * 2. 只做描述、不做诊断 —— 呈现用户自己的数据，不下心理结论
 * 3. 数值用于相对趋势，不宣称绝对意义
 * ========================================================================== */

const DAY_MS = 24 * 60 * 60 * 1000;

/** 情绪 → 强度（0..1，越高越沉重）。产品经验值，仅用于自身纵向对比。 */
const EMOTION_INTENSITY: Record<string, number> = {
  痛苦: 0.9,
  愤怒: 0.85,
  焦虑: 0.7,
  委屈: 0.65,
  不安: 0.6,
  失落: 0.55,
  孤独: 0.5,
  矛盾: 0.45,
  疲惫: 0.4,
  空虚: 0.35,
};

/** 主色 → 效价（-1 沉郁 .. +1 明亮）。按关键词模糊匹配，兼容两套色名表。 */
const COLOR_VALENCE_RULES: [keyword: string, valence: number][] = [
  ["灰", -0.55],
  ["深", -0.3],
  ["暗", -0.4],
  ["亮", 0.7],
  ["嫩", 0.6],
  ["暖", 0.6],
  ["黄", 0.6],
  ["绿", 0.55],
  ["粉", 0.5],
  ["橙", 0.45],
  ["蓝", 0.25],
  ["紫", 0.15],
  ["红", 0.0],
];

const HEAVY_THRESHOLD = 0.6;
const LOW_PRESSURE = 1005;

function startOfDay(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

/** 周一为一周起点 */
function startOfWeek(now: number): Date {
  const d = startOfDay(now);
  const weekday = (d.getDay() + 6) % 7; // 周一=0
  return addDays(d, -weekday);
}

export function colorValence(label?: string): number | null {
  if (!label) return null;
  for (const [keyword, valence] of COLOR_VALENCE_RULES) {
    if (label.includes(keyword)) return valence;
  }
  return null;
}

/**
 * 单条事件 → 情绪压力值（0..1，越高越沉重）。
 * bubble 表达的是关系距离、不构成情绪评分，返回 null。
 */
export function eventStress(event: TrackerEvent): number | null {
  if (event.type === "shredder") {
    return EMOTION_INTENSITY[event.emotion ?? ""] ?? 0.5;
  }
  if (event.type === "palette") {
    const valence = colorValence(event.dominantLabel);
    if (valence === null) return null;
    return (1 - valence) / 2; // -1..1 → 1..0
  }
  return null;
}

/* ==========================================================================
 * P1-2 情绪转变轨迹（折线图数据源）
 * ======================================================================== */

export type TrajectoryPoint = {
  key: string;
  label: string;
  /** 当天情绪压力均值；null = 当天没有可评分的记录 */
  stress: number | null;
  count: number;
};

export function moodTrajectory(
  events: TrackerEvent[],
  days = 7,
  now = Date.now(),
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const base = startOfDay(now);

  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = addDays(base, -i);
    const from = dayStart.getTime();
    const to = from + DAY_MS;
    const dayEvents = events.filter((e) => e.ts >= from && e.ts < to);
    const scores = dayEvents
      .map(eventStress)
      .filter((s): s is number => s !== null);

    points.push({
      key: dateKey(from),
      label: shortDateLabel(from),
      stress: scores.length
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : null,
      count: dayEvents.length,
    });
  }

  return points;
}

/* ==========================================================================
 * P1-1 天气 × 情绪关联分析（差异化核心）
 * ======================================================================== */

/** 降水 / 低光照天气 */
function isGloomyWeather(weather: string): boolean {
  return /雨|雷|雪|阴|雾|霾/.test(weather);
}

/** 阴雨或低气压（对照 PM 设定的 1005hPa 阈值） */
function isGloomy(snapshot: NonNullable<TrackerEvent["weather"]>): boolean {
  return isGloomyWeather(snapshot.weather) || snapshot.pressure < LOW_PRESSURE;
}

type WeatherEvent = TrackerEvent & { weather: NonNullable<TrackerEvent["weather"]> };

export type WeatherMoodInsight = {
  headline: string;
  detail: string;
  /** 样本充足度：low 时 UI 应弱化措辞，避免显得武断 */
  confidence: "low" | "medium" | "high";
  sampleSize: number;
};

function confidenceOf(sample: number): WeatherMoodInsight["confidence"] {
  if (sample >= 12) return "high";
  if (sample >= 6) return "medium";
  return "low";
}

/**
 * 天气 × 情绪关联。
 *
 * 两条产出路径（都能出就出对比，只有一类天气就出单侧描述）：
 * - 有对照：比较「阴雨/低气压」与「晴好」两组的沉重情绪占比差
 * - 无对照：描述带天气记录中，最常出现情绪落在阴雨/低气压的比例
 */
export function analyzeWeatherMood(events: TrackerEvent[]): WeatherMoodInsight | null {
  const scored: WeatherEvent[] = [];
  for (const e of events) {
    if (!e.weather) continue;
    if (eventStress(e) === null) continue;
    scored.push(e as WeatherEvent);
  }

  if (scored.length < 4) return null;

  const gloomy = scored.filter((e) => isGloomy(e.weather));
  const clear = scored.filter((e) => !isGloomy(e.weather));
  const heavyIn = (list: WeatherEvent[]) =>
    list.filter((e) => (eventStress(e) ?? 0) >= HEAVY_THRESHOLD).length;

  // 路径 A：两类天气都有样本 → 做对比
  if (gloomy.length >= 3 && clear.length >= 3) {
    const gloomyRatio = heavyIn(gloomy) / gloomy.length;
    const clearRatio = heavyIn(clear) / clear.length;

    if (gloomyRatio - clearRatio >= 0.25) {
      const pct = Math.round(gloomyRatio * 100);
      return {
        headline: `阴雨或低气压的日子里，你有 ${pct}% 的记录是比较沉重的`,
        detail: `晴好天气下这个比例是 ${Math.round(clearRatio * 100)}%。天气也许真的在影响你，这类日子可以多给自己一点缓冲。`,
        confidence: confidenceOf(scored.length),
        sampleSize: scored.length,
      };
    }

    if (clearRatio - gloomyRatio >= 0.25) {
      return {
        headline: `有意思的是，你在晴好天气里反而记录得更多一些`,
        detail: `阴雨天的沉重记录占比 ${Math.round(gloomyRatio * 100)}%，晴天是 ${Math.round(clearRatio * 100)}%。也许好天气让你更愿意面对情绪。`,
        confidence: confidenceOf(scored.length),
        sampleSize: scored.length,
      };
    }

    return null; // 差异不显著，不硬凑结论
  }

  // 路径 B：只有单侧天气样本 → 描述最常出现情绪与该天气的共现
  const dominant = gloomy.length > clear.length ? gloomy : clear;
  if (dominant.length < 4) return null;

  const emotions = dominant
    .filter((e) => e.type === "shredder" && e.emotion)
    .map((e) => (e as Extract<TrackerEvent, { type: "shredder" }>).emotion as string);

  if (emotions.length < 3) return null;

  const top = Object.entries(
    emotions.reduce<Record<string, number>>((acc, emo) => {
      acc[emo] = (acc[emo] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

  const isGloomySide = gloomy.length > clear.length;
  const weatherWord = isGloomySide ? "阴雨或低气压" : "晴好";

  return {
    headline: `你记录的 ${top[1]} 次「${top[0]}」，都发生在${weatherWord}的日子`,
    detail: `目前样本还集中在一种天气里，等记录再多一些，就能看出天气和情绪之间的关联了。`,
    confidence: "low",
    sampleSize: scored.length,
  };
}

/** 还差多少条带天气的记录才能出关联分析（用于引导文案） */
export function weatherInsightGap(events: TrackerEvent[]): number {
  const withWeather = events.filter((e) => e.weather && eventStress(e) !== null).length;
  return Math.max(0, 4 - withWeather);
}

/* ==========================================================================
 * P1-3 连续记录 streak
 * ======================================================================== */

export type StreakInfo = {
  current: number;
  longest: number;
  todayDone: boolean;
};

export function computeStreak(events: TrackerEvent[], now = Date.now()): StreakInfo {
  if (events.length === 0) return { current: 0, longest: 0, todayDone: false };

  const daySet = new Set(events.map((e) => dateKey(e.ts)));
  const has = (d: Date) => daySet.has(dateKey(d.getTime()));

  // 最长连续
  const sortedKeys = [...daySet].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sortedKeys) {
    const [y, m, d] = key.split("-").map(Number);
    const cur = new Date(y, m - 1, d);
    run = prev && addDays(prev, 1).getTime() === cur.getTime() ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }

  // 当前连续：今天还没过完，今天没记录不算断
  const today = startOfDay(now);
  const todayDone = has(today);
  let cursor = todayDone ? today : addDays(today, -1);

  if (!has(cursor)) return { current: 0, longest, todayDone };

  let current = 0;
  while (has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, todayDone };
}

/** streak 的文案化呈现（PM: "你已经连续 7 天照顾自己的情绪了"） */
export function streakMessage(streak: StreakInfo): string {
  if (streak.current === 0) {
    return streak.longest > 0
      ? `你最长连续记录过 ${streak.longest} 天，今天重新开始也不晚。`
      : "从今天开始，记录下第一笔吧。";
  }
  if (streak.current === 1) return "这是你连续照顾自己情绪的第 1 天，很好的开始。";
  if (streak.current < 7) {
    return `你已经连续 ${streak.current} 天照顾自己的情绪了。`;
  }
  if (streak.current < 30) {
    return `你已经连续 ${streak.current} 天照顾自己的情绪了，这一周很稳。`;
  }
  return `你已经连续 ${streak.current} 天照顾自己的情绪了，这件事正在变成你的习惯。`;
}

/* ==========================================================================
 * P1-2 周对比
 * ======================================================================== */

export type WeekComparison = {
  thisWeek: number;
  lastWeek: number;
  delta: number;
  /** 面向用户的对比句；样本不足时为引导句 */
  text: string;
  hasData: boolean;
};

export function weekOverWeek(events: TrackerEvent[], now = Date.now()): WeekComparison {
  const thisMonday = startOfWeek(now);
  const lastMonday = addDays(thisMonday, -7);
  const thisStart = thisMonday.getTime();
  const lastStart = lastMonday.getTime();

  const countBetween = (from: number, to: number) =>
    events.filter((e) => e.ts >= from && e.ts < to).length;

  // 上周按「整周」计，本周按「周一至今」计，避免半周被误判为下滑
  const thisWeek = countBetween(thisStart, now + 1);
  const lastWeek = countBetween(lastStart, thisStart);

  if (thisWeek === 0 && lastWeek === 0) {
    return { thisWeek, lastWeek, delta: 0, text: "这周还没有记录，写一笔就开始了。", hasData: false };
  }

  const delta = thisWeek - lastWeek;
  if (lastWeek === 0) {
    return { thisWeek, lastWeek, delta, text: `这周已经记录了 ${thisWeek} 次，比上周多了 ${thisWeek} 次。`, hasData: true };
  }
  if (delta === 0) {
    return { thisWeek, lastWeek, delta, text: `这周记录了 ${thisWeek} 次，和上周一样。`, hasData: true };
  }
  const word = delta > 0 ? "多" : "少";
  return {
    thisWeek,
    lastWeek,
    delta,
    text: `这周记录了 ${thisWeek} 次，比上周${word}了 ${Math.abs(delta)} 次。`,
    hasData: true,
  };
}

/** 针对具体情绪的周对比（PM 原话："这周焦虑次数比上周少了 3 次"） */
export function emotionWeekOverWeek(
  events: TrackerEvent[],
  now = Date.now(),
): string | null {
  const thisMonday = startOfWeek(now);
  const lastMonday = addDays(thisMonday, -7);
  const thisStart = thisMonday.getTime();
  const lastStart = lastMonday.getTime();

  const pick = (from: number, to: number) =>
    events
      .filter((e) => e.type === "shredder" && e.ts >= from && e.ts < to && e.emotion)
      .map((e) => (e as Extract<TrackerEvent, { type: "shredder" }>).emotion as string);

  const thisEmotions = pick(thisStart, now + 1);
  const lastEmotions = pick(lastStart, thisStart);

  if (thisEmotions.length === 0 || lastEmotions.length === 0) return null;

  const tally = (list: string[]) =>
    list.reduce<Record<string, number>>((acc, emo) => {
      acc[emo] = (acc[emo] ?? 0) + 1;
      return acc;
    }, {});

  const thisTally = tally(thisEmotions);
  const lastTally = tally(lastEmotions);

  // 取本周最多的情绪做对比
  const [topEmotion, topCount] = Object.entries(thisTally).sort((a, b) => b[1] - a[1])[0];
  const lastCount = lastTally[topEmotion] ?? 0;

  if (lastCount === 0) return null;
  if (topCount === lastCount) return null;

  const word = topCount < lastCount ? "少" : "多";
  return `这周「${topEmotion}」出现了 ${topCount} 次，比上周${word}了 ${Math.abs(topCount - lastCount)} 次。`;
}

/* ==========================================================================
 * P1-3 站内周报（周日打开即见，不依赖推送权限）
 * ======================================================================== */

export type WeeklyReport = {
  rangeLabel: string;
  total: number;
  topEmotion: string | null;
  stressAvg: number | null;
  highlights: string[];
  closing: string;
};

export function buildWeeklyReport(events: TrackerEvent[], now = Date.now()): WeeklyReport | null {
  const monday = startOfWeek(now);
  const from = monday.getTime();
  const weekEvents = events.filter((e) => e.ts >= from && e.ts <= now);

  if (weekEvents.length === 0) return null;

  const sunday = addDays(monday, 6);
  const rangeLabel = `${shortDateLabel(from)} - ${shortDateLabel(sunday.getTime())}`;

  const emotionList = weekEvents
    .filter((e) => e.type === "shredder" && e.emotion)
    .map((e) => (e as Extract<TrackerEvent, { type: "shredder" }>).emotion as string);

  const topEmotion = emotionList.length
    ? Object.entries(
        emotionList.reduce<Record<string, number>>((acc, emo) => {
          acc[emo] = (acc[emo] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const scores = weekEvents.map(eventStress).filter((s): s is number => s !== null);
  const stressAvg = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  const highlights: string[] = [];
  highlights.push(`本周你记录了自己 ${weekEvents.length} 次。`);

  if (topEmotion) highlights.push(`这周最常面对的情绪是「${topEmotion}」。`);

  const streak = computeStreak(events, now);
  if (streak.current >= 2) highlights.push(`连续记录 ${streak.current} 天。`);

  const closing =
    stressAvg === null
      ? "愿意记录，本身就是在照顾自己。"
      : stressAvg >= HEAVY_THRESHOLD
        ? "这周对你来说不算轻松，但你没有绕开它，这已经很了不起了。"
        : stressAvg <= 0.4
          ? "这周的整体状态比较平稳，好好收下这份轻松。"
          : "这周起起伏伏，都是正常的。下周继续陪着你。";

  return { rangeLabel, total: weekEvents.length, topEmotion, stressAvg, highlights, closing };
}

/* ==========================================================================
 * P1-2 月度总结（模板化 + 情绪文案库，无需 LLM）
 * ======================================================================== */

const MONTH_CLOSING_LIGHT = [
  "这个月你走过来了，也把自己照顾得不错。",
  "平缓的月份也是好月份，休息本身是一种进展。",
];
const MONTH_CLOSING_HEAVY = [
  "这个月你承受了很多，能一路写下来，已经很不容易。",
  "有些月份就是会重一点，你没有停下，这本身就是力量。",
];
const MONTH_CLOSING_MID = [
  "这个月有晴有雨，你都一笔笔记下来了。",
  "情绪起落被你认真对待过，这就是这个月的收获。",
];

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

export type MonthlySummary = {
  monthLabel: string;
  total: number;
  activeDays: number;
  topEmotion: string | null;
  stressAvg: number | null;
  lines: string[];
};

export function buildMonthlySummary(
  events: TrackerEvent[],
  now = Date.now(),
): MonthlySummary | null {
  const nowDate = new Date(now);
  const from = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
  const monthEvents = events.filter((e) => e.ts >= from && e.ts <= now);

  if (monthEvents.length === 0) return null;

  const monthLabel = `${nowDate.getMonth() + 1} 月`;
  const activeDays = new Set(monthEvents.map((e) => dateKey(e.ts))).size;

  const emotionList = monthEvents
    .filter((e) => e.type === "shredder" && e.emotion)
    .map((e) => (e as Extract<TrackerEvent, { type: "shredder" }>).emotion as string);

  const topEmotion = emotionList.length
    ? Object.entries(
        emotionList.reduce<Record<string, number>>((acc, emo) => {
          acc[emo] = (acc[emo] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const scores = monthEvents.map(eventStress).filter((s): s is number => s !== null);
  const stressAvg = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  const lines: string[] = [];
  lines.push(`${monthLabel}你记录了 ${monthEvents.length} 次，分布在 ${activeDays} 天里。`);
  if (topEmotion) lines.push(`最常出现的情绪是「${topEmotion}」。`);

  const seed = Math.floor(from / DAY_MS);
  if (stressAvg === null) {
    lines.push(pick(MONTH_CLOSING_MID, seed));
  } else if (stressAvg >= HEAVY_THRESHOLD) {
    lines.push(pick(MONTH_CLOSING_HEAVY, seed));
  } else if (stressAvg <= 0.4) {
    lines.push(pick(MONTH_CLOSING_LIGHT, seed));
  } else {
    lines.push(pick(MONTH_CLOSING_MID, seed));
  }

  return { monthLabel, total: monthEvents.length, activeDays, topEmotion, stressAvg, lines };
}

/* ==========================================================================
 * P1-4 社交气泡：关系距离变化
 * ======================================================================== */

export type RelationChange = {
  label: string;
  /** 本次距离（0=最近，1=最远） */
  current: number;
  previous: number;
  /** 负数 = 更近了，正数 = 更远了（单位：距离值差） */
  delta: number;
  /** 变化百分比（相对上一次） */
  percent: number;
};

/**
 * 最近一次气泡记录 vs 上一次，逐角色对比距离。
 * distance 语义：0=最近，1=最远 → delta 为负代表"更近了"。
 */
export function relationChanges(events: TrackerEvent[]): RelationChange[] {
  const bubbleEvents = events
    .filter((e): e is Extract<TrackerEvent, { type: "bubble" }> => e.type === "bubble")
    .filter((e) => Array.isArray(e.roles) && e.roles!.length > 0)
    .sort((a, b) => b.ts - a.ts);

  if (bubbleEvents.length < 2) return [];

  const latest = bubbleEvents[0];
  const previous = bubbleEvents[1];
  const prevMap = new Map((previous.roles ?? []).map((r) => [r.label, r.distance]));

  const changes: RelationChange[] = [];
  for (const role of latest.roles ?? []) {
    const prev = prevMap.get(role.label);
    if (prev === undefined) continue;
    const delta = role.distance - prev;
    if (Math.abs(delta) < 0.02) continue; // 抖动忽略
    changes.push({
      label: role.label,
      current: role.distance,
      previous: prev,
      delta,
      percent: prev === 0 ? 0 : (delta / prev) * 100,
    });
  }

  return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
