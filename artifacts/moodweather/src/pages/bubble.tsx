import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { recordEvent } from "@/lib/tracker";

type SceneKey = "family" | "school" | "work" | "custom";

type Scene = {
  key: SceneKey;
  label: string;
  presets: string[];
};

const SCENES: Scene[] = [
  { key: "family", label: "家庭", presets: ["父母", "伴侣", "兄弟姐妹", "孩子"] },
  { key: "school", label: "学校", presets: ["老师", "同学", "室友", "朋友"] },
  { key: "work", label: "工作", presets: ["上司", "同事", "下属", "客户"] },
  { key: "custom", label: "自定义", presets: [] },
];

const ROLE_COLORS = [
  "#FF9F45",
  "#4C9EE8",
  "#9B6CE8",
  "#FF6B9D",
  "#6FCF97",
  "#FFD166",
  "#E63946",
  "#5C7A99",
];

const FEELINGS: { id: string; label: string; hint: string }[] = [
  { id: "warm", label: "温暖", hint: "想多靠近一点" },
  { id: "calm", label: "平静", hint: "保持现在的距离也很好" },
  { id: "tired", label: "疲惫", hint: "想要喘一口气" },
  { id: "miss", label: "想念", hint: "其实还是希望被惦记" },
  { id: "complex", label: "复杂", hint: "有点说不清楚" },
  { id: "guarded", label: "保留", hint: "想留一点距离" },
];

type Role = {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  z: number;
  feeling?: string;
};

type Position = { x: number; y: number };

const BUBBLE_SIZE = 84;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function describeDistance(label: string, ratio: number): string {
  if (ratio < 0.25) return `你和「${label}」很近，温暖的陪伴在身边。`;
  if (ratio < 0.5) return `你和「${label}」还在彼此能听到的地方。`;
  if (ratio < 0.75) return `你和「${label}」之间，留出了一段需要走的路。`;
  return `「${label}」似乎被你放得有点远了，没关系，慢慢来。`;
}

function depthVisuals(z: number) {
  const depthScale = 1 + z * 0.45;
  const opacity = clamp(0.55 + z * 0.45, 0.25, 1);
  const blur = z < -0.15 ? Math.abs(z) * 5 : 0;
  return { depthScale, opacity, blur };
}

function buildPresetRoles(scene: Scene, width: number, height: number): Role[] {
  if (scene.presets.length === 0) return [];
  const center = { x: width / 2, y: height / 2 };
  const baseRadius = Math.min(width, height) * 0.34;
  return scene.presets.map((label, index) => {
    const angle = (index / scene.presets.length) * Math.PI * 2 - Math.PI / 2;
    const radius = baseRadius * randomBetween(0.85, 1.2);
    return {
      id: `${scene.key}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      color: ROLE_COLORS[index % ROLE_COLORS.length],
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
      z: randomBetween(-0.5, 0.5),
    };
  });
}

export default function Bubble() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scene, setScene] = useState<SceneKey>("family");
  const [roles, setRoles] = useState<Role[]>([]);
  const [zoom, setZoom] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const sceneInitializedRef = useRef<string | null>(null);

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
    if (sceneInitializedRef.current === scene) return;
    sceneInitializedRef.current = scene;
    const sceneConfig = SCENES.find((item) => item.key === scene);
    if (!sceneConfig) return;
    const presetRoles = buildPresetRoles(sceneConfig, size.width, size.height);
    setRoles(presetRoles);
    if (presetRoles.length > 0 || scene === "custom") {
      recordEvent({
        type: "bubble",
        ts: Date.now(),
        scene: sceneConfig.label,
        rolesCount: presetRoles.length,
      });
    }
  }, [scene, size.width, size.height]);

  const center = useMemo<Position>(
    () => ({ x: size.width / 2, y: size.height / 2 }),
    [size.width, size.height],
  );

  const maxDistance = useMemo(
    () => Math.hypot(size.width, size.height) / 2,
    [size.width, size.height],
  );

  const distances = useMemo(() => {
    const result: Record<string, { distance: number; ratio: number }> = {};
    for (const role of roles) {
      const distance = Math.hypot(role.x - center.x, role.y - center.y);
      result[role.id] = {
        distance,
        ratio: maxDistance ? clamp(distance / maxDistance, 0, 1) : 0,
      };
    }
    return result;
  }, [roles, center.x, center.y, maxDistance]);

  const closestRole = useMemo<{ role: Role; ratio: number } | null>(() => {
    let nearest: { role: Role; ratio: number } | null = null;
    for (const role of roles) {
      const info = distances[role.id];
      if (!info) continue;
      if (nearest === null || info.ratio < nearest.ratio) {
        nearest = { role, ratio: info.ratio };
      }
    }
    return nearest;
  }, [distances, roles]);

  function handleDrag(id: string, dx: number, dy: number) {
    if (!size.width || !size.height) return;
    setRoles((prev) =>
      prev.map((role) =>
        role.id === id
          ? {
              ...role,
              x: clamp(role.x + dx / zoom, BUBBLE_SIZE / 2, size.width - BUBBLE_SIZE / 2),
              y: clamp(role.y + dy / zoom, BUBBLE_SIZE / 2, size.height - BUBBLE_SIZE / 2),
            }
          : role,
      ),
    );
  }

  function handleAddRole() {
    const label = newRoleName.trim();
    if (!label) return;
    if (!size.width || !size.height) return;
    setRoles((prev) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(size.width, size.height) * 0.32;
      const next: Role = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        color: ROLE_COLORS[prev.length % ROLE_COLORS.length],
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        z: randomBetween(-0.4, 0.4),
      };
      const nextRoles = [...prev, next];
      const sceneConfig = SCENES.find((item) => item.key === scene);
      recordEvent({
        type: "bubble",
        ts: Date.now(),
        scene: sceneConfig?.label ?? scene,
        rolesCount: nextRoles.length,
      });
      return nextRoles;
    });
    setNewRoleName("");
  }

  function handleRemoveRole(id: string) {
    setRoles((prev) => prev.filter((role) => role.id !== id));
    setOpenId(null);
  }

  function handleSelectFeeling(id: string, feeling: string) {
    setRoles((prev) =>
      prev.map((role) => (role.id === id ? { ...role, feeling } : role)),
    );
    setOpenId(null);
  }

  function handleAdjustDepth(id: string, delta: number) {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === id ? { ...role, z: clamp(role.z + delta, -0.9, 0.9) } : role,
      ),
    );
  }

  function handleResetZoom() {
    setZoom(1);
  }

  function handleSceneSwitch(key: SceneKey) {
    if (key === scene) return;
    sceneInitializedRef.current = null;
    setScene(key);
    setOpenId(null);
  }

  const openRole = openId ? roles.find((role) => role.id === openId) ?? null : null;

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

        <div className="rounded-3xl border border-white/40 bg-white/70 p-3 shadow-sm backdrop-blur-md">
          <div className="text-[11px] text-foreground/55">选择场景</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCENES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSceneSwitch(item.key)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs transition-all duration-200 active:scale-95",
                  scene === item.key
                    ? "border-foreground/70 bg-foreground/85 text-white"
                    : "border-foreground/15 bg-white text-foreground/70 hover:border-foreground/30",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-3xl border border-white/40 bg-white/40 shadow-2xl backdrop-blur-md"
          style={{ height: "min(70vh, 560px)" }}
        >
          <div
            className="absolute left-0 top-0 origin-center"
            style={{
              width: size.width,
              height: size.height,
              transform: `scale(${zoom})`,
              transformOrigin: `${size.width / 2}px ${size.height / 2}px`,
              transition: "transform 0.25s ease",
            }}
          >
            <svg
              width={size.width}
              height={size.height}
              className="pointer-events-none absolute inset-0"
            >
              <defs>
                <radialGradient id="bubble-link-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>
              {roles.map((role) => {
                const info = distances[role.id];
                const ratio = info?.ratio ?? 0;
                const visuals = depthVisuals(role.z);
                const opacity = clamp(visuals.opacity * (1 - ratio * 0.4), 0.18, 0.9);
                const dash = ratio > 0.55 ? "4 6" : "0";
                return (
                  <line
                    key={role.id}
                    x1={center.x}
                    y1={center.y}
                    x2={role.x}
                    y2={role.y}
                    stroke={role.color}
                    strokeWidth={1.4 + (1 - ratio) * 1.2}
                    strokeOpacity={opacity}
                    strokeDasharray={dash}
                    strokeLinecap="round"
                  />
                );
              })}
              <circle
                cx={center.x}
                cy={center.y}
                r={70}
                fill="url(#bubble-link-glow)"
              />
            </svg>

            <div
              className="absolute rounded-full bg-white/90 shadow-lg backdrop-blur-md"
              style={{
                width: 92,
                height: 92,
                left: center.x - 46,
                top: center.y - 46,
              }}
            >
              <div className="flex h-full w-full items-center justify-center text-base font-medium text-foreground/80">
                我
              </div>
            </div>

            {roles.map((role) => {
              const visuals = depthVisuals(role.z);
              const renderSize = BUBBLE_SIZE * visuals.depthScale;
              return (
                <motion.div
                  key={role.id}
                  drag
                  dragMomentum={false}
                  dragElastic={0}
                  onDrag={(_, info) => handleDrag(role.id, info.delta.x, info.delta.y)}
                  onDoubleClick={() => setOpenId(role.id)}
                  whileTap={{ scale: 1.05 }}
                  className="absolute flex cursor-grab items-center justify-center rounded-full text-xs font-medium text-white shadow-lg backdrop-blur-sm active:cursor-grabbing"
                  style={{
                    width: renderSize,
                    height: renderSize,
                    left: role.x - renderSize / 2,
                    top: role.y - renderSize / 2,
                    backgroundColor: `${role.color}d9`,
                    opacity: visuals.opacity,
                    filter: visuals.blur > 0 ? `blur(${visuals.blur}px)` : "none",
                    touchAction: "none",
                  }}
                >
                  <div className="flex flex-col items-center gap-0.5 text-center">
                    <span>{role.label}</span>
                    {role.feeling ? (
                      <span className="rounded-full bg-white/30 px-1.5 py-0.5 text-[9px]">
                        {role.feeling}
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/25 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">
            拖动气泡 · 双击设置情绪/远近
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setZoom((value) => clamp(value + 0.15, 0.5, 1.6))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-foreground/70 shadow-sm transition-colors hover:bg-white"
              aria-label="放大"
            >
              <ZoomIn size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((value) => clamp(value - 0.15, 0.5, 1.6))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-foreground/70 shadow-sm transition-colors hover:bg-white"
              aria-label="缩小"
            >
              <ZoomOut size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-foreground/70 shadow-sm transition-colors hover:bg-white"
              aria-label="重置缩放"
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/40 bg-white/85 p-3 shadow-sm backdrop-blur-md">
          <div className="text-[11px] text-foreground/55">添加角色</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={newRoleName}
              onChange={(event) => setNewRoleName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddRole();
                }
              }}
              maxLength={8}
              placeholder="给这段关系起个名字，比如：奶奶 / 室友"
              className="min-h-10 flex-1 rounded-full border border-foreground/15 bg-white px-4 text-sm text-foreground/80 placeholder:text-foreground/40 focus:border-foreground/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddRole}
              disabled={!newRoleName.trim()}
              className="inline-flex min-h-10 items-center gap-1 rounded-full bg-foreground/85 px-3 text-xs font-medium text-white transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} strokeWidth={2} />
              添加
            </button>
          </div>
        </div>

        <AnimatePresence>
          {closestRole ? (
            <motion.div
              key={closestRole.role.id + closestRole.ratio.toFixed(2)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-white/40 bg-white/85 p-4 shadow-md backdrop-blur-md"
            >
              <div className="text-xs text-foreground/55">距离感知</div>
              <p className="mt-1 text-sm leading-6 text-foreground/80">
                {describeDistance(closestRole.role.label, closestRole.ratio)}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openRole ? (
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
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-foreground/55">编辑关系</div>
                  <div className="text-base font-medium text-foreground/85">
                    {openRole.label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/55"
                  aria-label="关闭"
                >
                  <X size={14} strokeWidth={1.8} />
                </button>
              </div>

              <div className="mt-4 text-xs text-foreground/55">远近</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustDepth(openRole.id, -0.25)}
                  className="min-h-9 flex-1 rounded-full bg-foreground/5 text-xs text-foreground/65 transition-colors hover:bg-foreground/10"
                >
                  推远一点
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustDepth(openRole.id, 0.25)}
                  className="min-h-9 flex-1 rounded-full bg-foreground/85 text-xs text-white transition-colors hover:bg-foreground"
                >
                  拉近一点
                </button>
              </div>

              <div className="mt-4 text-xs text-foreground/55">情绪标签</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {FEELINGS.map((feeling) => (
                  <button
                    key={feeling.id}
                    type="button"
                    onClick={() => handleSelectFeeling(openRole.id, feeling.label)}
                    className="flex min-h-14 flex-col items-start gap-0.5 rounded-2xl border border-foreground/10 bg-white px-3 py-2 text-left transition-all duration-200 active:scale-[0.98] hover:border-primary/40 hover:bg-primary/5"
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
                onClick={() => handleRemoveRole(openRole.id)}
                className="mt-4 w-full rounded-full bg-red-50 py-2 text-sm text-red-500 transition-colors hover:bg-red-100"
              >
                移除这个角色
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
