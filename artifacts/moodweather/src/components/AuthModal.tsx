import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";

type Mode = "login" | "register";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError("密码至少 8 位");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        track("auth_login_success", {});
      } else {
        await register(email.trim(), password, displayName.trim() || undefined);
        track("auth_register_success", {});
      }
      onClose();
      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-5 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground/85">
            {mode === "login" ? "登录" : "注册"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/55 hover:bg-foreground/10"
            aria-label="关闭"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1 rounded-full bg-foreground/5 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-full py-1.5 text-xs transition-colors ${
              mode === "login"
                ? "bg-white font-medium text-foreground/85 shadow-sm"
                : "text-foreground/55"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-full py-1.5 text-xs transition-colors ${
              mode === "register"
                ? "bg-white font-medium text-foreground/85 shadow-sm"
                : "text-foreground/55"
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === "register" ? (
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={50}
              placeholder="昵称（可选）"
              className="min-h-11 w-full rounded-full border border-foreground/15 bg-white px-4 text-sm text-foreground/85 outline-none placeholder:text-foreground/40 focus:border-primary/50"
            />
          ) : null}
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="邮箱"
            autoComplete="email"
            className="min-h-11 w-full rounded-full border border-foreground/15 bg-white px-4 text-sm text-foreground/85 outline-none placeholder:text-foreground/40 focus:border-primary/50"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "register" ? "密码（至少 8 位）" : "密码"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="min-h-11 w-full rounded-full border border-foreground/15 bg-white px-4 text-sm text-foreground/85 outline-none placeholder:text-foreground/40 focus:border-primary/50"
          />

          {error ? (
            <p className="text-xs leading-relaxed text-red-500">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-full bg-foreground/85 py-2 text-sm font-medium text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "请稍候..."
              : mode === "login"
                ? "登录"
                : "注册并登录"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
