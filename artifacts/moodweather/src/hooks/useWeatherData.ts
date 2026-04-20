import { useEffect, useState } from "react";

export type WeatherData = {
  temp: number;
  humidity: number;
  pressure: number;
  weather: string;
  description: string;
  moodText: string;
};

const mockWeatherData: Record<string, WeatherData> = {
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

    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      setData(mockWeatherData[cityName] ?? mockWeatherData["深圳"]);
      setIsLoading(false);
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cityName]);

  return { data, isLoading, error };
}