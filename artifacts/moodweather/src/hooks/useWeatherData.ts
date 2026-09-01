import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type WeatherData = {
  temp: number;
  humidity: number;
  pressure: number;
  weather: string;
  description: string;
  moodText: string;
};

/** API 不可用时的降级数据（避免页面空白） */
const fallbackWeatherData: Record<string, WeatherData> = {
  北京: {
    temp: 22,
    humidity: 34,
    pressure: 998,
    weather: "晴",
    description: "晴朗",
    moodText: "湿度较低，心情明朗，适合户外活动。",
  },
  上海: {
    temp: 19,
    humidity: 78,
    pressure: 1008,
    weather: "雨",
    description: "小雨",
    moodText: "雨声轻落，适合放慢节奏，整理思绪。",
  },
  深圳: {
    temp: 25,
    humidity: 92,
    pressure: 1010,
    weather: "晴",
    description: "晴",
    moodText: "阳光温和，空气舒展，适合出门散步或轻松办公。",
  },
};

export function useWeatherData(cityName: string) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    api
      .getWeather(cityName)
      .then((result) => {
        if (cancelled) return;
        // 源头防御：即使上游数据缺字段，也保证下游拿到合法结构
        setData({
          temp: Number(result.temp) || 0,
          humidity: Number(result.humidity) || 0,
          pressure: Number(result.pressure) || 1013,
          weather: String(result.weather ?? "晴"),
          description: String(result.description ?? ""),
          moodText: String(result.moodText ?? ""),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 网络/服务不可用：降级到内置数据并提示（不阻塞使用）
        setData(fallbackWeatherData[cityName] ?? fallbackWeatherData["深圳"]);
        setError(
          err instanceof Error
            ? `实时天气暂不可用（${err.message}），当前为内置参考数据。`
            : "实时天气暂不可用，当前为内置参考数据。",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityName]);

  return { data, isLoading, error };
}
