import { useEffect, useState } from "react";

export type WeatherData = {
  temp: number;
  humidity: number;
  pressure: number;
  weather: string;
  description: string;
  moodText: string;
};

type OpenWeatherResponse = {
  weather?: Array<{
    main?: string;
    description?: string;
  }>;
  main?: {
    temp?: number;
    humidity?: number;
    pressure?: number;
  };
  message?: string;
};

function createMoodText(data: Pick<WeatherData, "humidity" | "pressure" | "weather">) {
  if (data.humidity > 85) {
    return "空气湿度偏高，适合放慢节奏，给自己留一点缓冲。";
  }

  if (data.weather.includes("雨") || data.weather.includes("阴")) {
    return "光线较柔，适合降低消耗，处理轻量任务。";
  }

  if (data.pressure < 1000) {
    return "气压偏低，身心可能更敏感，适合减少外界干扰。";
  }

  return "天气状态较平稳，适合保持当前节奏，安排户外或专注活动。";
}

export function useWeatherData(cityName: string) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    const controller = new AbortController();

    async function fetchWeather() {
      if (!apiKey) {
        setData(null);
        setError("缺少 VITE_WEATHER_API_KEY，请先配置天气 API Key。");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: `${cityName},CN`,
          appid: apiKey,
          units: "metric",
          lang: "zh_cn",
        });
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as OpenWeatherResponse;

        if (!response.ok) {
          throw new Error(result.message || "天气数据获取失败。");
        }

        const weather = result.weather?.[0]?.description || result.weather?.[0]?.main || "未知";
        const temp = Math.round(result.main?.temp ?? 0);
        const humidity = result.main?.humidity ?? 0;
        const pressure = result.main?.pressure ?? 0;
        const weatherData = {
          temp,
          humidity,
          pressure,
          weather,
          description: weather,
          moodText: createMoodText({ humidity, pressure, weather }),
        };

        setData(weatherData);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        setData(null);
        setError(err instanceof Error ? err.message : "天气数据获取失败。");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchWeather();

    return () => controller.abort();
  }, [cityName]);

  return { data, isLoading, error };
}