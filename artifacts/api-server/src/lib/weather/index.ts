import type { WeatherData, WeatherProvider } from "./types";
import { OpenMeteoProvider } from "./open-meteo";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟
const CACHE_MAX_ENTRIES = 100;

type CacheEntry = { data: WeatherData; expiresAt: number };

/**
 * 天气内存缓存：带 TTL 与容量上限。
 * 多实例部署时每实例各有一份缓存（可接受）；
 * 后续需要跨实例共享时再迁移至 Redis。
 */
export class CachedWeatherProvider implements WeatherProvider {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inner: WeatherProvider;

  constructor(inner: WeatherProvider = new OpenMeteoProvider()) {
    this.inner = inner;
  }

  async getCurrent(lat: number, lon: number): Promise<WeatherData> {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;

    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.data;
    }

    const data = await this.inner.getCurrent(lat, lon);

    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    if (this.cache.size > CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }

    return data;
  }
}

export const weatherProvider: WeatherProvider = new CachedWeatherProvider();
