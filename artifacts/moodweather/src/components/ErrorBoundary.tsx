import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string; stack: string };

/** 全局错误边界：防止单个页面运行时错误导致整站白屏，并展示可诊断的错误摘要 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", stack: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message ?? String(error),
      stack: error?.stack ?? "",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
    // 把组件栈并入展示，便于定位（development 下更有用）
    this.setState((prev) =>
      prev.stack.includes("componentStack") || !info.componentStack
        ? prev
        : { ...prev, stack: `${prev.stack}\n\n组件栈：\n${info.componentStack}` },
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] w-full items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-foreground/10 bg-white/80 p-6 text-center shadow-lg backdrop-blur-md">
            <p className="text-base font-medium text-foreground/85">
              页面出了点小问题
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/60">
              可以刷新页面重试；如果问题持续，请稍后再来。
            </p>
            {this.state.message ? (
              <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-foreground/5 p-3 text-left text-[11px] leading-relaxed text-foreground/60 whitespace-pre-wrap break-all">
                {this.state.message}
                {this.state.stack ? `\n\n${this.state.stack}` : ""}
              </pre>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-foreground/85 px-5 text-sm font-medium text-white transition-colors hover:bg-foreground"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
