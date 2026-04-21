import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Eraser, RotateCcw, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { recordEvent } from "@/lib/tracker";
import type { WeatherData } from "@/hooks/useWeatherData";

type BrushType = "burst" | "diffuse" | "smooth";

type PaletteColor = { hex: string; label: string };

type ColorBucketKey =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "gray";

type ColorStat = { key: ColorBucketKey; label: string; ratio: number; hex: string };

const BRUSHES: { key: BrushType; name: string; mood: string; description: string }[] = [
  { key: "burst", name: "炸裂", mood: "愤怒", description: "向外飞溅的粒子" },
  { key: "diffuse", name: "晕染", mood: "忧郁", description: "缓慢扩散的水墨" },
  { key: "smooth", name: "丝滑", mood: "平静", description: "柔和流动的弧线" },
];

const COLOR_BUCKETS: { key: ColorBucketKey; label: string; hex: string }[] = [
  { key: "red", label: "红色", hex: "#E63946" },
  { key: "orange", label: "橙色", hex: "#FF9F45" },
  { key: "yellow", label: "黄色", hex: "#FFD166" },
  { key: "green", label: "绿色", hex: "#6FCF97" },
  { key: "blue", label: "蓝色", hex: "#4C9EE8" },
  { key: "purple", label: "紫色", hex: "#9B6CE8" },
  { key: "pink", label: "粉色", hex: "#FF6B9D" },
  { key: "gray", label: "灰色", hex: "#9CA3AF" },
];

function getBackgroundStyle(weather: string): string {
  if (weather.includes("雨")) {
    return "linear-gradient(160deg,#5B7A99 0%,#4A6B8A 45%,#3F5A7A 100%)";
  }
  if (weather.includes("阴")) {
    return "linear-gradient(160deg,#9AB1C7 0%,#7B92AE 50%,#6F7FA0 100%)";
  }
  if (weather.includes("雪")) {
    return "linear-gradient(160deg,#E8EEF5 0%,#CFD8E3 60%,#B8C2D1 100%)";
  }
  if (weather.includes("雾")) {
    return "linear-gradient(160deg,#C9CCD1 0%,#A8ADB5 100%)";
  }
  return "linear-gradient(160deg,#FFD6A5 0%,#FFB088 50%,#F39A7B 100%)";
}

function getCompensationColors(weather: string): PaletteColor[] {
  if (weather.includes("雨") || weather.includes("阴")) {
    return [
      { hex: "#FFD166", label: "亮黄" },
      { hex: "#FF9F45", label: "暖橙" },
      { hex: "#FF6B9D", label: "粉红" },
    ];
  }
  if (weather.includes("雪") || weather.includes("雾")) {
    return [
      { hex: "#FF6B9D", label: "粉红" },
      { hex: "#9B6CE8", label: "深紫" },
      { hex: "#E63946", label: "胭脂" },
    ];
  }
  return [
    { hex: "#4C9EE8", label: "湖蓝" },
    { hex: "#6FCF97", label: "嫩绿" },
    { hex: "#9B6CE8", label: "薰紫" },
  ];
}

function classifyPixel(r: number, g: number, b: number): ColorBucketKey | null {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta < 22 || max < 40) {
    return "gray";
  }

  let hue = 0;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  hue *= 60;
  if (hue < 0) hue += 360;

  const lightness = (max + min) / 2 / 255;
  const saturation = delta === 0 ? 0 : delta / (255 - Math.abs(max + min - 255));

  if (saturation < 0.18) {
    return "gray";
  }

  if (hue < 15 || hue >= 345) return "red";
  if (hue < 40) return lightness > 0.55 ? "orange" : "red";
  if (hue < 70) return "yellow";
  if (hue < 170) return "green";
  if (hue < 250) return "blue";
  if (hue < 295) return "purple";
  if (hue < 345) return "pink";
  return "red";
}

const COLOR_PHRASES: Record<ColorBucketKey, string[]> = {
  blue: [
    "像清晨的湖面，安静地承载着未说出口的思绪。",
    "像被夜色温柔包裹的远山，把心事都放进了深处。",
    "像雨后初醒的天空，留出一点透气的缝隙给自己。",
  ],
  yellow: [
    "像阳光洒在窗台，温柔地融化了心中的冰霜。",
    "像午后泡过的茶，微微发亮，熨帖着每一处不安。",
    "像还未开口的笑意，藏在眼角的小小光。",
  ],
  red: [
    "像晚霞燃烧，是内心未曾熄的勇气。",
    "像还在跳的火苗，提醒你别把热爱关掉。",
    "像被压住又冒出来的心跳声，原来你还想要更多。",
  ],
  orange: [
    "像傍晚街角的灯，把疲惫照成了一种温柔。",
    "像冬日里捧在手心的烤橘，缓缓往骨头里送暖。",
    "像被风吹动的火焰，轻轻地告诉你还可以继续往前。",
  ],
  green: [
    "像被雨水洗过的叶子，干净地呼吸着新的可能。",
    "像清晨林间的薄雾，让心慢慢松开。",
    "像一颗刚刚发芽的种子，说不出，但已经在长。",
  ],
  purple: [
    "像介于白昼与夜晚之间的天空，留给心事一个缓冲的角落。",
    "像隔着窗帘看见的月光，暧昧又温柔。",
    "像还没说出口的浪漫，安静地，但确实存在。",
  ],
  pink: [
    "像把柔软偷偷藏起来的人，被自己感动了一下。",
    "像清晨的脸颊，藏着一点点不愿承认的期待。",
    "像被风吹皱的花瓣，柔软是你最强的能力。",
  ],
  gray: [
    "像还没醒透的早晨，允许自己慢一点也没关系。",
    "像把所有声音收起来的那一刻，安静本身就是回答。",
    "像被雾包住的城市，看不清不要紧，慢慢走就好。",
  ],
};

const SECONDARY_PHRASES: Record<ColorBucketKey, string> = {
  blue: "里面藏着一点点想要被理解的安静。",
  yellow: "悄悄给自己留了一束光。",
  red: "提醒你，还有想要燃烧的事。",
  orange: "把疲惫一点点哄睡了。",
  green: "在最累的地方长出了新的枝。",
  purple: "把没说出口的浪漫，藏好了。",
  pink: "对自己也愿意温柔了一次。",
  gray: "允许自己有一段不必解释的留白。",
};

function buildInterpretation(stats: ColorStat[]): string {
  if (stats.length === 0) {
    return "画布上还很安静，像是等待一场温柔的开始。";
  }

  const dominant = stats[0];
  const dominantPercent = Math.round(dominant.ratio * 100);
  const phrasePool = COLOR_PHRASES[dominant.key];
  const phrase = phrasePool[Math.floor(Math.random() * phrasePool.length)];

  const opener = `你用了大约 ${dominantPercent}% 的${dominant.label}，${phrase}`;

  if (stats.length > 1) {
    const second = stats[1];
    const secondPercent = Math.round(second.ratio * 100);
    if (secondPercent >= 12) {
      return `${opener}\n中间又掺了 ${secondPercent}% 的${second.label}，${SECONDARY_PHRASES[second.key]}`;
    }
  }

  return opener;
}

function analyzeCanvas(canvas: HTMLCanvasElement): ColorStat[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const { width, height } = canvas;
  if (width === 0 || height === 0) return [];

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const counts: Record<ColorBucketKey, number> = {
    red: 0,
    orange: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    purple: 0,
    pink: 0,
    gray: 0,
  };

  let total = 0;
  const step = 4 * 4;
  for (let i = 0; i < data.length; i += step) {
    const alpha = data[i + 3];
    if (alpha < 24) continue;
    const bucket = classifyPixel(data[i], data[i + 1], data[i + 2]);
    if (!bucket) continue;
    counts[bucket] += 1;
    total += 1;
  }

  if (total === 0) return [];

  return COLOR_BUCKETS.map(({ key, label, hex }) => ({
    key,
    label,
    hex,
    ratio: counts[key] / total,
  }))
    .filter((stat) => stat.ratio > 0.02)
    .sort((a, b) => b.ratio - a.ratio);
}

export default function Palette({ cityData }: { cityData: WeatherData | null }) {
  const weather = cityData?.weather ?? "晴";
  const compensationColors = useMemo(() => getCompensationColors(weather), [weather]);
  const backgroundStyle = useMemo(() => getBackgroundStyle(weather), [weather]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const isDrawingRef = useRef(false);

  const [brush, setBrush] = useState<BrushType>("smooth");
  const [color, setColor] = useState<string>(compensationColors[0]?.hex ?? "#4C9EE8");
  const [hasStrokes, setHasStrokes] = useState(false);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [stats, setStats] = useState<ColorStat[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setColor((current) => {
      if (compensationColors.some((option) => option.hex === current)) {
        return current;
      }
      return compensationColors[0]?.hex ?? current;
    });
  }, [compensationColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    function resize() {
      if (!canvas || !wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      const previousCtx = previous.getContext("2d");
      if (previousCtx && canvas.width > 0 && canvas.height > 0) {
        previousCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (previous.width > 0 && previous.height > 0) {
          ctx.drawImage(
            previous,
            0,
            0,
            previous.width,
            previous.height,
            0,
            0,
            rect.width,
            rect.height,
          );
        }
      }
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function drawSegment(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (brush === "smooth") {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(
        from.x,
        from.y,
        (from.x + to.x) / 2,
        (from.y + to.y) / 2,
      );
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (brush === "diffuse") {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const steps = Math.max(1, Math.floor(distance / 4));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const x = from.x + dx * t;
        const y = from.y + dy * t;
        for (let layer = 0; layer < 4; layer += 1) {
          const radius = 10 + layer * 8;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `${color}55`);
          gradient.addColorStop(0.4, `${color}22`);
          gradient.addColorStop(1, `${color}00`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = color;
    const baseRadius = 2.4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(to.x, to.y, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    const particleCount = 14;
    for (let i = 0; i < particleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 6 + Math.random() * 24;
      const px = to.x + Math.cos(angle) * distance;
      const py = to.y + Math.sin(angle) * distance;
      const radius = 0.6 + Math.random() * 2;
      ctx.globalAlpha = 0.25 + Math.random() * 0.45;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    isDrawingRef.current = true;
    lastPointRef.current = point;
    drawSegment(point, point);
    setHasStrokes(true);
    setInterpretation(null);
    setStats([]);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const point = getCanvasPoint(event);
    const last = lastPointRef.current ?? point;
    drawSegment(last, point);
    lastPointRef.current = point;
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setHasStrokes(false);
    setInterpretation(null);
    setStats([]);
  }

  function handleFinish() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsAnalyzing(true);
    setInterpretation(null);
    window.setTimeout(() => {
      const result = analyzeCanvas(canvas);
      setStats(result);
      setInterpretation(buildInterpretation(result));
      setIsAnalyzing(false);
      const dominant = result[0];
      recordEvent({
        type: "palette",
        ts: Date.now(),
        dominantColor: dominant?.hex,
        dominantLabel: dominant?.label,
        ratio: dominant?.ratio,
      });
      window.requestAnimationFrame(() => {
        document
          .getElementById("palette-interpretation")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }, 320);
  }

  return (
    <div
      className="min-h-[100dvh] w-full transition-colors duration-500"
      style={{ background: backgroundStyle }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-5 pb-10">
        <header className="flex items-center justify-between text-white/90">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>返回</span>
          </Link>
          <div className="text-right">
            <div className="text-base font-medium tracking-wide">情绪调色盘</div>
            <div className="text-[11px] text-white/70">
              {cityData ? `${cityData.weather}・${cityData.temp}°` : "加载中"}
            </div>
          </div>
        </header>

        <div
          ref={wrapperRef}
          className="relative w-full overflow-hidden rounded-3xl border border-white/30 bg-white/10 shadow-2xl backdrop-blur-sm"
          style={{ height: "min(70vh, 560px)" }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
            className="absolute inset-0 h-full w-full touch-none"
          />

          <div className="pointer-events-auto absolute right-3 top-3 flex flex-col items-end gap-2">
            <div className="rounded-full bg-black/25 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-md">
              天气补偿色
            </div>
            <div className="flex flex-col gap-2">
              {compensationColors.map((option) => (
                <button
                  key={option.hex}
                  type="button"
                  onClick={() => setColor(option.hex)}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-full bg-white/85 px-2 py-1 text-xs text-foreground/80 shadow-sm transition-all duration-200 active:scale-95",
                    color === option.hex ? "ring-2 ring-white" : "",
                  )}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-white/70"
                    style={{ backgroundColor: option.hex }}
                  />
                  <span className="pr-1">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {!hasStrokes ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-black/25 px-4 py-1.5 text-xs text-white/80 backdrop-blur-md">
                用手指或鼠标在这里画一画吧
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/30 bg-white/85 p-4 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs text-foreground/55">选择笔触</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-foreground/5 px-3 text-xs text-foreground/70 transition-colors hover:bg-foreground/10"
              >
                <Eraser size={14} strokeWidth={1.8} />
                清空
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={!hasStrokes || isAnalyzing}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles size={14} strokeWidth={1.8} />
                {isAnalyzing ? "解读中..." : "完成"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BRUSHES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setBrush(option.key)}
                className={cn(
                  "flex min-h-16 flex-col items-start gap-1 rounded-2xl border px-3 py-2 text-left transition-all duration-200 active:scale-[0.98]",
                  brush === option.key
                    ? "border-primary bg-primary/10"
                    : "border-foreground/10 bg-white/60 hover:bg-white",
                )}
              >
                <div className="text-sm font-medium text-foreground/80">
                  {option.name}
                  <span className="ml-1 text-[10px] text-foreground/45">{option.mood}</span>
                </div>
                <div className="text-[11px] leading-snug text-foreground/55">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {interpretation ? (
            <motion.section
              id="palette-interpretation"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-3xl border border-white/30 bg-white/90 p-5 shadow-xl backdrop-blur-md"
            >
              <div className="mb-3 flex items-center gap-2 text-primary/80">
                <Sparkles size={16} strokeWidth={1.8} />
                <h3 className="text-sm font-medium">心绪解读</h3>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] text-foreground/55 transition-colors hover:bg-foreground/10"
                >
                  <RotateCcw size={12} strokeWidth={1.8} />
                  换一种说法
                </button>
              </div>
              <p className="whitespace-pre-line text-sm leading-7 text-foreground/80">
                {interpretation}
              </p>
              {stats.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {stats.slice(0, 4).map((stat) => (
                    <div key={stat.key} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-white"
                        style={{ backgroundColor: stat.hex }}
                      />
                      <span className="w-12 text-xs text-foreground/60">{stat.label}</span>
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(stat.ratio * 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: stat.hex }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-foreground/55">
                        {Math.round(stat.ratio * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
