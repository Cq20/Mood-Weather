import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Wind } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const HEALING_PHRASES = [
  "烦恼已粉碎，愿你轻装前行。",
  "每一片碎屑，都是被释放的重量。",
  "把心里的褶皱抖一抖，松一点也没关系。",
  "今天的尘埃落下了，你可以慢慢呼吸。",
  "粉碎不是消失，是变成风，带它走。",
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

function buildPieces(text: string): Piece[] {
  return Array.from(text).map((char, index) => ({
    id: index,
    char,
    dx: (Math.random() - 0.5) * 600,
    dy: -200 - Math.random() * 320,
    rotate: (Math.random() - 0.5) * 540,
    delay: Math.random() * 0.18,
  }));
}

export default function Shredder() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [phrase, setPhrase] = useState<string>("");

  const trimmed = useMemo(() => text.trim(), [text]);

  function handleShred() {
    if (!trimmed || phase === "shredding") return;
    setPieces(buildPieces(trimmed));
    setPhase("shredding");
    window.setTimeout(() => {
      setPhrase(HEALING_PHRASES[Math.floor(Math.random() * HEALING_PHRASES.length)]);
      setPhase("done");
    }, 1100);
  }

  function handleReset() {
    setText("");
    setPieces([]);
    setPhrase("");
    setPhase("idle");
  }

  return (
    <div
      className="min-h-[100dvh] w-full"
      style={{
        background:
          "linear-gradient(160deg,#1f2937 0%,#374151 45%,#4b5563 100%)",
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
                把今天压在心里的事，写下来
              </p>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={5}
                maxLength={120}
                placeholder="比如：明天的会议、那句没说出口的话…"
                className="w-full resize-none rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/45 focus:border-white/40 focus:outline-none"
              />
              <div className="flex w-full items-center justify-between text-[11px] text-white/45">
                <span>最多 120 字</span>
                <span>{text.length} / 120</span>
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
                      duration: 1.05,
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
                <p className="text-base leading-8 text-white/90">{phrase}</p>
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
