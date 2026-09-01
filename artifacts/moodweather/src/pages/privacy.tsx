import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-md backdrop-blur-md">
      <h2 className="text-sm font-medium text-foreground/85">{title}</h2>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-foreground/65">
        {children}
      </div>
    </section>
  );
}

export default function Privacy() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    setFeedback(null);
    try {
      const blob = await api.exportMyData();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `moodweather-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setFeedback("已生成数据文件，请查看下载内容。");
    } catch (err) {
      setFeedback(err instanceof Error ? `导出失败：${err.message}` : "导出失败，请稍后再试。");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    const ok = window.confirm(
      "确定永久删除你的账号吗？你的全部情绪记录、日记与关系数据将被清空，且无法恢复。",
    );
    if (!ok) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await api.deleteAccount();
      setFeedback("账号已删除，所有云端数据已清除。");
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setFeedback(err instanceof Error ? `删除失败：${err.message}` : "删除失败，请稍后再试。");
      setDeleting(false);
    }
  }

  return (
    <div
      className="min-h-[100dvh] w-full"
      style={{
        background:
          "linear-gradient(160deg,#fef3f0 0%,#f5ebff 45%,#e9f3ff 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-5 pb-10">
        <header className="flex items-center justify-between text-foreground/70">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white/55 px-3 py-1.5 text-sm backdrop-blur-md transition-colors hover:bg-white/75"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>返回</span>
          </Link>
          <div className="text-right">
            <div className="text-base font-medium tracking-wide text-foreground/80">隐私政策</div>
            <div className="text-[11px] text-foreground/55">你的数据，你做主</div>
          </div>
        </header>

        <Section title="我们收集什么">
          <p>· 账号信息：注册邮箱、昵称（如你选择注册）。</p>
          <p>· 情绪记录：调色盘的色彩统计、粉碎机输入的内容与情绪标签、社交气泡的场景、角色与关系距离。</p>
          <p>· 天气偏好：你浏览时选择的城市（用于提供实时天气）。</p>
          <p>· 日志数据：服务器自动记录请求路径、状态码、耗时（不含请求体与 Cookie）。</p>
        </Section>

        <Section title="如何使用">
          <p>· 情绪记录仅用于在"心境日记"页面向你本人展示趋势与统计。</p>
          <p>· 天气数据来自第三方服务（Open-Meteo），仅按城市坐标查询，不包含你的个人信息。</p>
          <p>· 我们不会出售、出租或以任何方式向第三方提供你的个人信息。</p>
        </Section>

        <Section title="存储与安全">
          <p>· 未登录时：所有记录仅保存在你的浏览器本地（localStorage），不离开你的设备。</p>
          <p>· 登录后：记录同步到服务器数据库，仅你的账号可见，传输全程使用 HTTPS，密码经加盐哈希存储。</p>
          <p>· 服务器日志不记录你输入的具体内容。</p>
        </Section>

        <Section title="情绪危机与安全">
          <p>· 本产品不是专业心理服务，不提供诊断、治疗或干预建议。</p>
          <p>· 若你写下的内容疑似涉及自我伤害，我们会在页面内温和提醒，并展示 24 小时心理援助热线（希望24热线 400-161-9995），供你随时联系专业人士。</p>
          <p>· 我们不会因为识别到危机内容而主动联系你或第三方；相关判断仅用于本机提示。</p>
        </Section>

        <Section title="你的权利">
          <p>· 导出：随时导出你的全部数据（JSON 文件）。</p>
          <p>· 删除：随时清空全部记录或删除整个账号（云端数据即刻删除，不可恢复）。</p>
          <p>· 撤回同意：清除浏览器站点数据即可停止本地记录；退出登录后不再向服务器同步。</p>
        </Section>

        {user ? (
          <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-md backdrop-blur-md">
            <h2 className="text-sm font-medium text-foreground/85">数据管理</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={exporting}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-foreground/85 px-4 text-xs font-medium text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} strokeWidth={1.8} />
                {exporting ? "生成中..." : "导出我的数据"}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-red-50 px-4 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} strokeWidth={1.8} />
                {deleting ? "删除中..." : "删除账号"}
              </button>
            </div>
            {feedback ? (
              <p className="mt-3 text-xs leading-relaxed text-foreground/60">{feedback}</p>
            ) : null}
          </section>
        ) : (
          <Section title="数据管理">
            <p>登录后可以在此导出全部数据或删除账号。未登录状态下，你的记录仅保存在本机浏览器。</p>
          </Section>
        )}

        <p className="text-center text-[11px] text-foreground/45">
          最后更新：2026-09-01 · 如需联系我们，请通过站点反馈渠道留言
        </p>
      </div>
    </div>
  );
}
