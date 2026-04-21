import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Wind } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { recordEvent } from "@/lib/tracker";

const EMOTIONS: { label: string; hex: string }[] = [
  { label: "失落", hex: "#6B7DB3" },
  { label: "疲惫", hex: "#8B7BA8" },
  { label: "不安", hex: "#D9A557" },
  { label: "痛苦", hex: "#C46B6B" },
  { label: "矛盾", hex: "#7B9EAE" },
  { label: "焦虑", hex: "#D98B5C" },
  { label: "愤怒", hex: "#C25450" },
  { label: "委屈", hex: "#B57BA8" },
  { label: "孤独", hex: "#5C7A99" },
  { label: "空虚", hex: "#9CA3AF" },
];

const HEALING_BY_EMOTION: Record<string, string[]> = {
  失落: [
    "心里少了一块没关系，光会从那里照进来。",
    "失去也是被释放的一种方式。",
    "空着的位置，是给新的可能留的。",
  ],
  疲惫: [
    "你已经很努力了，先把肩膀放下来。",
    "今晚的你，被允许什么都不做。",
    "把世界关一会儿，听一听自己的呼吸。",
  ],
  不安: [
    "不安是身体在提醒你被在乎着。",
    "把不安放进风里，让它替你呼吸一下。",
    "安全感是慢慢长出来的，不必着急。",
  ],
  痛苦: [
    "痛过的地方会长出更软的部分。",
    "这一刻很难，但你不是一个人在熬。",
    "你愿意写下来，已经是了不起的勇敢。",
  ],
  矛盾: [
    "允许自己同时拥有两种感受。",
    "不必现在就有答案，先抱抱自己。",
    "拉扯也是认真在生活的样子。",
  ],
  焦虑: [
    "焦虑只是过度的爱，给自己一点慢的允许。",
    "现在做一件具体的小事就好。",
    "未来可以等一等，先把此刻安顿好。",
  ],
  愤怒: [
    "愤怒是边界在说话，听一听它就好。",
    "你不必把这把火再吞回去。",
    "生气是因为你还在乎，那也很珍贵。",
  ],
  委屈: [
    "你的委屈，被认真看见了。",
    "委屈不是脆弱，是你太懂事了。",
    "被忽略的部分，今天起你自己抱抱它。",
  ],
  孤独: [
    "独处的时候你也不孤单，你陪着自己。",
    "孤独是最安静的自由。",
    "等天亮，会有一束光是属于你的。",
  ],
  空虚: [
    "空着也是一种空间，等温柔进来。",
    "不必填满，留白也美。",
    "先安静地存在一下，也很值得。",
  ],
};

const DEFAULT_PHRASES = [
  "烦恼已粉碎，愿你轻装前行。",
  "每一片碎屑，都是被释放的重量。",
  "把心里的褶皱抖一抖，松一点也没关系。",
  "今天的尘埃落下了，你可以慢慢呼吸。",
];

type Phase = "idle" | "shredding" | "done";

type Piece = {
  id: number;
  char: string;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
};

const MAX_PIECES = 240;

function buildPieces(text: string): Piece[] {
  const chars = Array.from(text).slice(0, MAX_PIECES);
  return chars.map((char, index) => ({
    id: index,
    char,
    dx: (Math.random() - 0.5) * 700,
    dy: -180 - Math.random() * 360,
    rotate: (Math.random() - 0.5) * 540,
    delay: Math.random() * 0.22,
  }));
}

export default function Shredder() {
  const [emotion, setEmotion] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [phrase, setPhrase] = useState<string>("");

  const trimmed = useMemo(() => text.trim(), [text]);
  const selectedColor = useMemo(
    () => EMOTIONS.find((item) => item.label === emotion)?.hex ?? "#94a3b8",
    [emotion],
  );

  function handleShred() {
    if (!trimmed || phase === "shredding") return;
    setPieces(buildPieces(trimmed));
    setPhase("shredding");
    recordEvent({
      type: "shredder",
      ts: Date.now(),
      emotion: emotion ?? undefined,
      length: trimmed.length,
    });
    window.setTimeout(() => {
      const pool =
        emotion && HEALING_BY_EMOTION[emotion]
          ? HEALING_BY_EMOTION[emotion]
          : DEFAULT_PHRASES;
      setPhrase(pool[Math.floor(Math.random() * pool.length)]);
      setPhase("done");
    }, 1200);
  }

  function handleReset() {
    setText("");
    setPieces([]);
    setPhrase("");
    setPhase("idle");
    setEmotion(null);
  }

  return (
    <div
      className="min-h-[100dvh] w-full transition-colors duration-500"
      style={{
        background: emotion
          ? `linear-gradient(160deg,#1f2937 0%,${selectedColor} 100%)`
          : "linear-gradient(160deg,#1f2937 0%,#374151 45%,#4b5563 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-5 pb-10 text-white">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>返回</span>
          </Link>
          <div className="text-right">
            <div className="text-base font-medium tracking-wide">烦恼粉碎机</div>
            <div className="text-[11px] text-white/65">写下来，让它变成风</div>
          </div>
        </header>

        {phase === "idle" ? (
          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="text-xs text-white/65">此刻你的情绪是</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {EMOTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    setEmotion((current) => (current === item.label ? null : item.label))
                  }
                  className={cn(
                    "min-h-9 rounded-full border px-3 text-sm transition-all duration-200 active:scale-95",
                    emotion === item.label
                      ? "border-white bg-white text-slate-700 shadow-md"
                      : "border-white/30 text-white/85 hover:border-white/60",
                  )}
                  style={
                    emotion === item.label ? { color: item.hex } : undefined
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
            {emotion ? (
              <p className="mt-3 text-[11px] text-white/65">
                已选择「{emotion}」，等会儿粉碎完会有一句对应的话陪你。
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-white/55">
                可以不选，也可以多按一下取消。
              </p>
            )}
          </div>
        ) : null}

        <div
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md"
          style={{ minHeight: "min(56vh, 460px)" }}
        >
          {phase === "idle" ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex w-full flex-col items-center gap-4"
            >
              <p className="text-center text-xs text-white/65">
                把今天压在心里的事，写下来，多少都可以
              </p>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                placeholder="比如：明天的会议、那句没说出口的话、一直绕不开的人…"
                className="w-full resize-y rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/45 focus:border-white/40 focus:outline-none"
              />
              <div className="flex w-full items-center justify-end text-[11px] text-white/45">
                <span>已写 {text.length} 字</span>
              </div>
            </motion.div>
          ) : null}

          {phase !== "idle" ? (
            <div className="relative flex h-72 w-full items-center justify-center">
              <AnimatePresence>
                {pieces.map((piece) => (
                  <motion.span
                    key={piece.id}
                    initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x: piece.dx,
                      y: piece.dy,
                      rotate: piece.rotate,
                      scale: 0.4,
                    }}
                    transition={{
                      duration: 1.1,
                      delay: piece.delay,
                      ease: "easeOut",
                    }}
                    className="absolute select-none text-lg font-medium text-white/90"
                  >
                    {piece.char === " " ? "\u00A0" : piece.char}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          ) : null}

          <AnimatePresence>
            {phase === "done" ? (
              <motion.div
                key="phrase"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              >
                <Sparkles size={20} strokeWidth={1.6} className="text-white/80" />
                {emotion ? (
                  <span
                    className="rounded-full bg-white/15 px-3 py-1 text-[11px] text-white/85"
                    style={{ borderColor: selectedColor }}
                  >
                    送给「{emotion}」的你
                  </span>
                ) : null}
                <p className="text-base leading-8 text-white/95">{phrase}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-3">
          {phase === "done" ? (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/90 px-5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 active:scale-95"
            >
              再写一条
            </button>
          ) : (
            <button
              type="button"
              onClick={handleShred}
              disabled={!trimmed || phase === "shredding"}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full bg-white/90 px-6 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 active:scale-95",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Wind size={16} strokeWidth={1.8} />
              {phase === "shredding" ? "粉碎中..." : "粉碎"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
