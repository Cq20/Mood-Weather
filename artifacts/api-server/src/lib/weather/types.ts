/** 统一天气数据结构（前端与 API 契约） */
export type WeatherData = {
  temp: number;
  humidity: number;
  pressure: number;
  weather: string;
  description: string;
  moodText: string;
};

/** 天气服务抽象：便于未来接入和风天气 / 高德等国内源 */
export interface WeatherProvider {
  getCurrent(lat: number, lon: number): Promise<WeatherData>;
}

/** WMO weather code → 中文天气分类 */
export function classifyWeatherCode(code: number): {
  weather: string;
  description: string;
} {
  if (code === 0) return { weather: "晴", description: "晴朗" };
  if (code === 1) return { weather: "晴", description: "基本晴朗" };
  if (code === 2) return { weather: "多云", description: "局部多云" };
  if (code === 3) return { weather: "阴", description: "阴天" };
  if (code === 45 || code === 48) return { weather: "雾", description: "有雾" };
  if (code === 51 || code === 53 || code === 55) return { weather: "雨", description: "毛毛雨" };
  if (code === 56 || code === 57) return { weather: "雨", description: "冻雨" };
  if (code === 61 || code === 63 || code === 65) return { weather: "雨", description: "小雨" };
  if (code === 66 || code === 67) return { weather: "雨", description: "冻雨" };
  if (code === 71 || code === 73 || code === 75) return { weather: "雪", description: "小雪" };
  if (code === 77) return { weather: "雪", description: "雪粒" };
  if (code === 80 || code === 81 || code === 82) return { weather: "雨", description: "阵雨" };
  if (code === 85 || code === 86) return { weather: "雪", description: "阵雪" };
  if (code === 95) return { weather: "雷暴", description: "雷阵雨" };
  if (code === 96 || code === 99) return { weather: "雷暴", description: "强雷暴" };
  return { weather: "晴", description: "天气未知" };
}

/** 生成心境文案（与产品原有规则一致，服务端统一输出） */
export function buildMoodText(data: {
  humidity: number;
  weather: string;
  pressure: number;
}): string {
  if (data.humidity > 90) {
    return "湿度偏高，心情可能容易闷，注意给自己透口气。";
  }
  if (data.weather.includes("雨") || data.weather.includes("阴")) {
    return "雨声轻落，适合放慢节奏，整理思绪。";
  }
  if (data.pressure < 1000) {
    return "气压偏低，情绪可能更敏感，给自己多点耐心。";
  }
  return "气象状态较平稳，适合保持当下节奏。";
}
