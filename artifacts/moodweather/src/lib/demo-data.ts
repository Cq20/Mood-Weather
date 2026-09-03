/**
 * 演示数据：?demo=1 时在 React 挂载前注入一组"像真实使用过的"示例记录。
 *
 * 数据刻意覆盖 P1 全部洞察：
 * - 今天/昨天/前天 连续记录 → streak
 * - 阴雨低气压日的沉重情绪 vs 晴好日的轻盈 → 天气×情绪关联
 * - 两次气泡（父母 0.8→0.6）→ 关系变化
 * - 跨上周/本周 → 周对比、周报、月度小结
 *
 * 全部相对当前时间生成，任何时刻打开 demo 结果都成立。
 */

const EVENTS_KEY = "moodweather_events_v1";
const JOURNALS_KEY = "moodweather_journals_v1";
const CONSENT_KEY = "moodweather_privacy_consent_v1";
const DAY = 86_400_000;

function at(offsetDays: number, hour: number): number {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

export function seedDemoData() {
  if (typeof window === "undefined") return;

  const events = [
    // ── 今天：阴雨低气压（沉重） + 记录家庭关系（父母拉近） ──
    { type: "shredder", ts: at(0, 20), emotion: "焦虑", length: 120, content: "今天下雨，工作压得我喘不过气，总觉得做不完。", weather: { temp: 24, weather: "雨", pressure: 998, humidity: 86 } },
    { type: "palette", ts: at(0, 21), dominantColor: "#9CA3AF", dominantLabel: "灰色", ratio: 0.7, weather: { temp: 24, weather: "雨", pressure: 998, humidity: 86 } },
    { type: "bubble", ts: at(0, 21), scene: "家庭场景", rolesCount: 3, roles: [{ label: "父母", distance: 0.6 }, { label: "伴侣", distance: 0.25 }, { label: "兄弟姐妹", distance: 0.5 }], weather: { temp: 24, weather: "雨", pressure: 998, humidity: 86 } },
    // ── 昨天：疲惫 ──
    { type: "shredder", ts: at(-1, 19), emotion: "疲惫", length: 80, content: "忙了一天，脑子转不动了。", weather: { temp: 26, weather: "多云", pressure: 1008, humidity: 72 } },
    // ── 前天：阴雨（焦虑 + 委屈） ──
    { type: "shredder", ts: at(-2, 18), emotion: "焦虑", length: 150, content: "又下雨，想到明天的汇报就紧张。", weather: { temp: 23, weather: "雨", pressure: 1001, humidity: 90 } },
    { type: "shredder", ts: at(-2, 22), emotion: "委屈", length: 60, content: "被误解了，不想解释。", weather: { temp: 23, weather: "雨", pressure: 1001, humidity: 90 } },
    // ── 4 天前：晴天（轻盈但有空虚） ──
    { type: "palette", ts: at(-4, 15), dominantColor: "#FFD166", dominantLabel: "亮黄", ratio: 0.6, weather: { temp: 29, weather: "晴", pressure: 1012, humidity: 60 } },
    { type: "shredder", ts: at(-4, 16), emotion: "空虚", length: 40, content: "天气很好，但我提不起劲。", weather: { temp: 29, weather: "晴", pressure: 1012, humidity: 60 } },
    // ── 上周：晴/多云（供周对比） ──
    { type: "shredder", ts: at(-8, 19), emotion: "焦虑", length: 90, content: "上周赶工的压力。", weather: { temp: 28, weather: "晴", pressure: 1015, humidity: 55 } },
    { type: "shredder", ts: at(-9, 20), emotion: "愤怒", length: 70, content: "上周因为沟通的事很生气。", weather: { temp: 27, weather: "多云", pressure: 1010, humidity: 65 } },
    { type: "palette", ts: at(-10, 15), dominantColor: "#FF9F45", dominantLabel: "橙色", ratio: 0.5, weather: { temp: 30, weather: "晴", pressure: 1013, humidity: 58 } },
    // ── 5 天前：第一次气泡（父母较远） ──
    { type: "bubble", ts: at(-5, 19), scene: "家庭场景", rolesCount: 3, roles: [{ label: "父母", distance: 0.8 }, { label: "伴侣", distance: 0.3 }, { label: "兄弟姐妹", distance: 0.5 }], weather: { temp: 28, weather: "晴", pressure: 1012, humidity: 62 } },
  ];

  const journals = [
    { id: "demo-1", content: "今天下着雨，把最近的焦虑都写下来粉碎了，好像轻松了一点。", createdAt: at(0, 20) },
    { id: "demo-2", content: "阳光很好的下午，虽然有点空虚，但出门走了走。", createdAt: at(-4, 15) },
  ];

  try {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    window.localStorage.setItem(JOURNALS_KEY, JSON.stringify(journals));
    // 演示免隐私弹窗（正式用户仍会看到并需主动同意）
    window.localStorage.setItem(CONSENT_KEY, "accepted");
  } catch {
    // 忽略存储异常
  }
}
