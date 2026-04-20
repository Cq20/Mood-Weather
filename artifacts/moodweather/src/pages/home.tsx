import { Sun, Cloud, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockData } from "@/mockData";

const CITIES = ["北京", "上海", "深圳"];

type CityData = {
  temp: number;
  humidity: number;
  pressure: number;
  weather: string;
  description: string;
  moodText: string;
};

function getWeatherIcon(weather: string) {
  if (weather === "晴") {
    return Sun;
  }

  if (weather === "雨") {
    return CloudRain;
  }

  return Cloud;
}

function getBackgroundClass(weather: string) {
  if (weather === "雨") {
    return "bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50";
  }

  return "bg-gradient-to-br from-orange-50 via-amber-50 to-stone-50";
}

function WeatherCard({
  currentCity,
  cityData,
}: {
  currentCity: string;
  cityData: CityData;
}) {
  const WeatherIcon = getWeatherIcon(cityData.weather);

  return (
    <div className="rounded-3xl bg-white/40 backdrop-blur-md border border-white/60 shadow-lg overflow-hidden transition-all duration-500 ease-out">
      <div className="p-8 pb-10 flex flex-col items-center text-center">
        <div className="text-foreground/60 font-medium mb-6 tracking-widest">{currentCity}</div>

        <div className="flex items-center justify-center text-primary mb-4 transition-transform duration-500 scale-110">
          <WeatherIcon size={64} strokeWidth={1.5} />
        </div>

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
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="p-8 bg-white/20 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-primary/70 mb-3 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-primary/70" />
          心境分析
        </h3>
        <p className="text-foreground/70 leading-relaxed text-sm md:text-base">
          {cityData.moodText}
        </p>
      </div>
    </div>
  );
}

export default function Home({
  currentCity,
  setCurrentCity,
}: {
  currentCity: string;
  setCurrentCity: (city: string) => void;
}) {
  const cityData = mockData[currentCity] ?? mockData["深圳"];
  const backgroundClass = getBackgroundClass(cityData.weather);

  return (
    <div className={cn("min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500", backgroundClass)}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-white/50 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-white/45 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-medium tracking-wide text-foreground/80">心境气象站</h1>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          {CITIES.map((city) => (
            <button
              key={city}
              onClick={() => setCurrentCity(city)}
              className={cn(
                "min-h-11 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out active:scale-95",
                currentCity === city
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white/50 text-foreground/70 hover:bg-white/80 backdrop-blur-sm shadow-sm"
              )}
            >
              {city}
            </button>
          ))}
        </div>

        <WeatherCard currentCity={currentCity} cityData={cityData} />
      </div>
    </div>
  );
}
