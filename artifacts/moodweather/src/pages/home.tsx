import React, { useState } from "react";
import { Sun, Cloud, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";

const CITIES = [
  {
    id: "beijing",
    name: "北京",
    weather: "晴朗",
    temp: "22°",
    icon: Sun,
    moodText: "湿度较低，心情明朗，适合户外活动。",
    moodTitle: "心境分析",
  },
  {
    id: "shanghai",
    name: "上海",
    weather: "多云",
    temp: "18°",
    icon: Cloud,
    moodText: "微风拂面，适合在午后泡一杯茶，享受片刻宁静。",
    moodTitle: "心境分析",
  },
  {
    id: "shenzhen",
    name: "深圳",
    weather: "阵雨",
    temp: "25°",
    icon: CloudRain,
    moodText: "雨水带来了清凉，是个适合室内阅读与沉思的好天气。",
    moodTitle: "心境分析",
  }
];

export default function Home() {
  const [activeCity, setActiveCity] = useState(CITIES[0]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-medium tracking-wide text-foreground/80">心境气象站</h1>
        </div>

        {/* City Selection */}
        <div className="flex justify-center gap-3 mb-8">
          {CITIES.map((city) => (
            <button
              key={city.id}
              onClick={() => setActiveCity(city)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out active:scale-95",
                activeCity.id === city.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white/50 text-foreground/70 hover:bg-white/80 backdrop-blur-sm shadow-sm"
              )}
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* Weather Card */}
        <div className="rounded-3xl bg-white/40 backdrop-blur-md border border-white/60 shadow-lg overflow-hidden transition-all duration-500 ease-out">
          {/* Upper Section: Weather */}
          <div className="p-8 pb-10 flex flex-col items-center text-center">
            <div className="text-foreground/60 font-medium mb-6 tracking-widest">{activeCity.name}</div>
            
            <div className="flex items-center justify-center text-primary mb-4 transition-transform duration-500 scale-110">
              {React.createElement(activeCity.icon, { size: 64, strokeWidth: 1.5 })}
            </div>
            
            <div className="text-6xl font-light text-foreground/80 mb-2">{activeCity.temp}</div>
            <div className="text-lg text-foreground/60">{activeCity.weather}</div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          {/* Lower Section: Mood Analysis */}
          <div className="p-8 bg-white/20 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-primary/70 mb-3 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary/70" />
              {activeCity.moodTitle}
            </h3>
            <p className="text-foreground/70 leading-relaxed text-sm md:text-base">
              {activeCity.moodText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
