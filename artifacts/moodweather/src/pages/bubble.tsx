import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type BubbleData = {
  id: string;
  label: string;
  hex: string;
  initialAngle: number;
  initialRadius: number;
};

const BUBBLES: BubbleData[] = [
  { id: "family", label: "父母", hex: "#FF9F45", initialAngle: -90, initialRadius: 0.55 },
  { id: "friend", label: "朋友", hex: "#4C9EE8", initialAngle: 0, initialRadius: 0.45 },
  { id: "teacher", label: "老师", hex: "#9B6CE8", initialAngle: 90, initialRadius: 0.7 },
  { id: "lover", label: "恋人", hex: "#FF6B9D", initialAngle: 180, initialRadius: 0.5 },
  { id: "self2", label: "同事", hex: "#6FCF97", initialAngle: -30, initialRadius: 0.75 },
];

const FEELINGS: { id: string; label: string; hint: string }[] = [
  { id: "warm", label: "温暖", hint: "想多靠近一点" },
  { id: "calm", label: "平静", hint: "保持现在的距离也很好" },
  { id: "tired", label: "疲惫", hint: "想要喘一口气" },
  { id: "miss", label: "想念", hint: "其实还是希望被惦记" },
];

type Position = { x: number; y: number };

const BUBBLE_SIZE = 88;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function describeDistance(label: string, ratio: number): string {
  if (ratio < 0.25) return `你和「${label}」很近，温暖的陪伴在身边。`;
  if (ratio < 0.5) return `你和「${label}」还在彼此能听到的地方。`;
  if (ratio < 0.75) return `你和「${label}」之间，留出了一段需要走的路。`;
  return `「${label}」似乎被你放得有点远了，没关系，慢慢来。`;
}

export default function Bubble() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [feelings, setFeelings] = useState<Record<string, string>>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function update() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size.width || !size.height) return;
    setPositions((prev) => {
      if (Object.keys(prev).length === BUBBLES.length) return prev;
      const center = { x: size.width / 2, y: size.height / 2 };
      const baseRadius = Math.min(size.width, size.height) * 0.38;
      const next: Record<string, Position> = {};
      BUBBLES.forEach((bubble) => {
        const angle = (bubble.initialAngle * Math.PI) / 180;
        const radius = baseRadius * bubble.initialRadius + 30;
        next[bubble.id] = {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        };
      });
      return next;
    });
  }, [size.width, size.height]);

  const center = useMemo(
    () => ({ x: size.width / 2, y: size.height / 2 }),
    [size.width, size.height],
  );

  const maxDistance = useMemo(
    () => Math.hypot(size.width, size.height) / 2,
    [size.width, size.height],
  );

  const distances = useMemo(() => {
    const result: Record<string, { distance: number; ratio: number }> = {};
    BUBBLES.forEach((bubble) => {
      const pos = positions[bubble.id];
      if (!pos || !maxDistance) {
        result[bubble.id] = { distance: 0, ratio: 0 };
        return;
      }
      const distance = Math.hypot(pos.x - center.x, pos.y - center.y);
      result[bubble.id] = {
        distance,
        ratio: clamp(distance / maxDistance, 0, 1),
      };
    });
    return result;
  }, [positions, center.x, center.y, maxDistance]);

  const closestBubble = useMemo<{ bubble: BubbleData; ratio: number } | null>(() => {
    let nearest: { bubble: BubbleData; ratio: number } | null = null;
    for (const bubble of BUBBLES) {
      const info = distances[bubble.id];
      if (!info) continue;
      if (nearest === null || info.ratio < nearest.ratio) {
        nearest = { bubble, ratio: info.ratio };
      }
    }
    return nearest;
  }, [distances]);

  function handleDrag(id: string, x: number, y: number) {
    if (!size.width || !size.height) return;
    setPositions((prev) => ({
      ...prev,
      [id]: {
        x: clamp(x, BUBBLE_SIZE / 2, size.width - BUBBLE_SIZE / 2),
        y: clamp(y, BUBBLE_SIZE / 2, size.height - BUBBLE_SIZE / 2),
      },
    }));
  }

  function handleSelectFeeling(id: string, feeling: string) {
    setFeelings((prev) => ({ ...prev, [id]: feeling }));
    setOpenId(null);
  }

  return (
    <div
      className="min-h-[100dvh] w-full"
      style={{
        background:
          "linear-gradient(160deg,#fef3c7 0%,#fde68a 35%,#fbcfe8 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-5 pb-10">
        <header className="flex items-center justify-between text-foreground/70">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white/55 px-3 py-1.5 text-sm backdrop-blur-md transition-colors hover:bg-white/75"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>返回</span>
          </Link>
          <div className="text-right">
            <div className="text-base font-medium tracking-wide text-foreground/80">社交气泡</div>
            <div className="text-[11px] text-foreground/55">把人，放在你想要的距离</div>
          </div>
        </header>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-3xl border border-white/40 bg-white/40 shadow-2xl backdrop-blur-md"
          style={{ height: "min(70vh, 560px)" }}
        >
          <div
            className="absolute rounded-full bg-white/80 shadow-lg backdrop-blur-md"
            style={{
              width: 96,
              height: 96,
              left: center.x - 48,
              top: center.y - 48,
            }}
          >
            <div className="flex h-full w-full items-center justify-center text-base font-medium text-foreground/80">
              我
            </div>
          </div>

          {BUBBLES.map((bubble) => {
            const pos = positions[bubble.id];
            if (!pos) return null;
            const info = distances[bubble.id] ?? { ratio: 0 };
            const opacity = clamp(1 - info.ratio * 1.05, 0.22, 1);
            const blur = clamp((info.ratio - 0.45) * 14, 0, 6);

            return (
              <motion.div
                key={bubble.id}
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                onDrag={(_, dragInfo) => {
                  handleDrag(
                    bubble.id,
                    pos.x + dragInfo.delta.x,
                    pos.y + dragInfo.delta.y,
                  );
                }}
                onDoubleClick={() => setOpenId(bubble.id)}
                whileTap={{ scale: 1.05 }}
                className="absolute flex cursor-grab items-center justify-center rounded-full text-sm font-medium text-white shadow-lg backdrop-blur-sm active:cursor-grabbing"
                style={{
                  width: BUBBLE_SIZE,
                  height: BUBBLE_SIZE,
                  left: pos.x - BUBBLE_SIZE / 2,
                  top: pos.y - BUBBLE_SIZE / 2,
                  backgroundColor: `${bubble.hex}d9`,
                  opacity,
                  filter: blur > 0 ? `blur(${blur}px)` : "none",
                  touchAction: "none",
                }}
              >
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span>{bubble.label}</span>
                  {feelings[bubble.id] ? (
                    <span className="rounded-full bg-white/30 px-2 py-0.5 text-[10px] text-white">
                      {feelings[bubble.id]}
                    </span>
                  ) : null}
                </div>
              </motion.div>
            );
          })}

          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/25 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">
            拖动气泡，双击添加情绪
          </div>
        </div>

        <AnimatePresence>
          {closestBubble ? (
            <motion.div
              key={closestBubble.bubble.id + closestBubble.ratio.toFixed(2)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-white/40 bg-white/85 p-4 shadow-md backdrop-blur-md"
            >
              <div className="text-xs text-foreground/55">距离感知</div>
              <p className="mt-1 text-sm leading-6 text-foreground/80">
                {describeDistance(closestBubble.bubble.label, closestBubble.ratio)}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openId ? (
          <motion.div
            key="feeling-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpenId(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            >
              <div className="text-xs text-foreground/55">为这段关系贴一个情绪</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {FEELINGS.map((feeling) => (
                  <button
                    key={feeling.id}
                    type="button"
                    onClick={() => handleSelectFeeling(openId, feeling.label)}
                    className={cn(
                      "flex min-h-16 flex-col items-start gap-1 rounded-2xl border border-foreground/10 bg-white px-3 py-2 text-left transition-all duration-200 active:scale-[0.98] hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground/80">
                      {feeling.label}
                    </span>
                    <span className="text-[11px] leading-snug text-foreground/55">
                      {feeling.hint}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="mt-4 w-full rounded-full bg-foreground/5 py-2 text-sm text-foreground/65 transition-colors hover:bg-foreground/10"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
