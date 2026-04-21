import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, MapPin, Sun, Cloud, CloudRain, Palette as PaletteIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/hooks/useWeatherData";

const CITIES = ["北京", "上海", "深圳"];

function generateMoodAdvice(weatherData: WeatherData) {
  if (weatherData.humidity > 90) {
    return "回南天防躁，注意情绪波动哦~";
  }

  if (weatherData.weather.includes("雨") || weatherData.weather.includes("阴")) {
    return "生理节能期，避免过度消耗。";
  }

  if (weatherData.pressure < 1000) {
    return "感知风暴，情绪可能更敏感。";
  }

  return "气象状态较平稳，适合保持当下节奏。";
}

function getWeatherIcon(weather: string) {
  if (weather.includes("晴")) {
    return Sun;
  }

  if (weather.includes("雨")) {
    return CloudRain;
  }

  return Cloud;
}

function getBackgroundClass(weather: string) {
  if (weather.includes("雨") || weather.includes("阴")) {
    return "bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50";
  }

  return "bg-gradient-to-br from-orange-50 via-amber-50 to-stone-50";
}

function WeatherCard({
  currentCity,
  cityData,
  isLoading,
  error,
}: {
  currentCity: string;
  cityData: WeatherData | null;
  isLoading: boolean;
  error: string | null;
}) {
  const WeatherIcon = getWeatherIcon(cityData?.weather ?? "晴");
  const moodAdvice = cityData ? generateMoodAdvice(cityData) : null;

  return (
    <motion.div
      key={currentCity}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="rounded-3xl bg-white/40 backdrop-blur-md border border-white/60 shadow-lg overflow-hidden transition-all duration-500 ease-out"
    >
      <motion.div
        key={`${currentCity}-weather-${cityData?.temp ?? "loading"}-${cityData?.weather ?? "empty"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="p-8 pb-10 flex flex-col items-center text-center"
      >
        <div className="text-foreground/60 font-medium mb-6 tracking-widest">{currentCity}</div>

        <div className="flex items-center justify-center text-primary mb-4 transition-transform duration-500 scale-110">
          <WeatherIcon size={64} strokeWidth={1.5} />
        </div>

        {isLoading ? (
          <div className="py-8 text-sm text-foreground/60">正在读取天气...</div>
        ) : error ? (
          <div className="py-8 text-sm leading-relaxed text-foreground/70">{error}</div>
        ) : cityData ? (
          <>
            <div className="text-6xl font-light text-foreground/80 mb-2">{cityData.temp}°</div>
            <div className="text-lg text-foreground/60">{cityData.description}</div>

            <div className="mt-6 grid grid-cols-2 gap-3 w-full">
              <div className="rounded-2xl bg-white/35 border border-white/50 px-4 py-3">
                <div className="text-xs text-foreground/45 mb-1">湿度</div>
                <div className="text-lg font-medium text-foreground/70">{cityData.humidity}%</div>
              </div>
              <div className="rounded-2xl bg-white/35 border border-white/50 px-4 py-3">
                <div className="text-xs text-foreground/45 mb-1">气压</div>
                <div className="text-lg font-medium text-foreground/70">{cityData.pressure} hPa</div>
              </div>
            </div>
          </>
        ) : null}
      </motion.div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="p-8 bg-white/20 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-primary/70 mb-3 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-primary/70" />
          心境分析
        </h3>
        <p className="text-foreground/70 leading-relaxed text-sm md:text-base">
          {cityData?.moodText ?? (isLoading ? "正在生成心境分析..." : "选择城市后将显示心境分析。")}
        </p>

        {moodAdvice ? (
          <div className="mt-5 rounded-2xl bg-white/35 border border-white/50 px-4 py-4">
            <p className="text-sm leading-relaxed text-foreground/75">{moodAdvice}</p>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function Home({
  currentCity,
  setCurrentCity,
  cityData,
  isLoading,
  error,
  locationStatus,
}: {
  currentCity: string;
  setCurrentCity: (city: string) => void;
  cityData: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  locationStatus: string;
}) {
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const backgroundClass = getBackgroundClass(cityData?.weather ?? "晴");
  const otherCities = CITIES.filter((city) => city !== currentCity);

  function handleCitySelect(city: string) {
    setCurrentCity(city);
    setIsCityMenuOpen(false);
  }

  return (
    <div className={cn("min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500", backgroundClass)}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-white/50 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-white/45 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium tracking-wide text-foreground/80">心境气象站</h1>
        </div>

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCityMenuOpen((value) => !value)}
              className="min-h-12 min-w-36 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-300 ease-out active:scale-95 flex items-center justify-center gap-2"
              aria-expanded={isCityMenuOpen}
            >
              <MapPin size={16} strokeWidth={1.8} />
              <span>{currentCity}</span>
              <ChevronDown
                size={16}
                strokeWidth={1.8}
                className={cn("transition-transform duration-200", isCityMenuOpen ? "rotate-180" : "rotate-0")}
              />
            </button>

            <AnimatePresence>
              {isCityMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 8, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute left-1/2 top-full z-20 w-36 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-1 shadow-lg backdrop-blur-md"
                >
                  {otherCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleCitySelect(city)}
                      className="min-h-11 w-full rounded-xl px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-primary/10 active:bg-primary/15"
                    >
                      {city}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <p className="text-center text-xs leading-relaxed text-foreground/45">{locationStatus}</p>
        </div>

        <AnimatePresence mode="wait">
          <WeatherCard
            currentCity={currentCity}
            cityData={cityData}
            isLoading={isLoading}
            error={error}
          />
        </AnimatePresence>

        <Link
          href="/palette"
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/40 px-5 py-3 text-sm font-medium text-foreground/75 shadow-sm backdrop-blur-md transition-all duration-300 ease-out border border-white/60 hover:bg-white/60 active:scale-[0.98]"
        >
          <PaletteIcon size={16} strokeWidth={1.8} />
          <span>进入情绪调色盘</span>
        </Link>
      </div>
    </div>
  );
}
