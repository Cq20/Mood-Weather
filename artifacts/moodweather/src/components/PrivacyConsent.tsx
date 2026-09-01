import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const CONSENT_KEY = "moodweather_privacy_consent_v1";

function hasConsent(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return true;
  }
}

function storeConsent() {
  try {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
  } catch {
    // 隐私模式等场景下忽略
  }
}

/** 隐私同意横幅：首次访问展示，同意后本地记住 */
export default function PrivacyConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasConsent());
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed inset-x-0 bottom-0 z-[9990] p-4"
      role="dialog"
      aria-label="隐私提示"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-3xl border border-white/60 bg-white/90 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck size={16} strokeWidth={1.8} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground/85">
              我们重视你的隐私
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/60">
              你的情绪记录、绘画与日记属于敏感个人信息。未登录时仅保存在本机浏览器；登录后会同步到服务器，仅你自己可见，可随时导出或删除。
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/privacy"
            className="inline-flex min-h-9 items-center rounded-full px-3 text-xs text-foreground/60 transition-colors hover:text-foreground/85"
          >
            查看隐私政策
          </Link>
          <button
            type="button"
            onClick={() => {
              storeConsent();
              setVisible(false);
            }}
            className="inline-flex min-h-9 items-center rounded-full bg-foreground/85 px-4 text-xs font-medium text-white transition-all duration-200 active:scale-[0.98] hover:bg-foreground"
          >
            同意并继续
          </button>
        </div>
      </div>
    </motion.div>
  );
}
