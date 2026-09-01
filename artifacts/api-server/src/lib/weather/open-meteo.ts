import {
  buildMoodText,
  classifyWeatherCode,
  type WeatherData,
  type WeatherProvider,
} from "./types";

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude={lat}&longitude={lon}" +
  "&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code" +
  "&timezone=auto";

const REQUEST_TIMEOUT_MS = 8000;

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    surface_pressure?: number;
    weather_code?: number;
  };
};

export class OpenMeteoProvider implements WeatherProvider {
  async getCurrent(lat: number, lon: number): Promise<WeatherData> {
    const url = OPEN_METEO_URL.replace("{lat}", String(lat)).replace(
      "{lon}",
      String(lon),
    );

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo 请求失败: HTTP ${response.status}`);
    }

    const body = (await response.json()) as OpenMeteoResponse;
    const current = body.current;
    if (!current) {
      throw new Error("Open-Meteo 响应缺少 current 数据");
    }

    const temp = current.temperature_2m ?? 20;
    const humidity = current.relative_humidity_2m ?? 60;
    const pressure = current.surface_pressure ?? 1013;
    const code = current.weather_code ?? 0;

    const { weather, description } = classifyWeatherCode(code);

    return {
      temp: Math.round(temp),
      humidity: Math.round(humidity),
      pressure: Math.round(pressure),
      weather,
      description,
      moodText: buildMoodText({ humidity, weather, pressure }),
    };
  }
}
