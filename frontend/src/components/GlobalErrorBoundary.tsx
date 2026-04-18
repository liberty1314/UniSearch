import React, { type ErrorInfo, type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ─── 开发模式检测（Vite 环境变量）────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * 全局 React ErrorBoundary
 *
 * 捕获子组件树中任何未处理的渲染错误，避免整个应用崩溃成空白页。
 *
 * 功能：
 * - 友好的错误 UI（与应用 Glassmorphism 设计风格一致）
 * - "刷新页面" 和 "返回首页" 两个恢复操作
 * - 开发环境：展示完整 error stack + component stack
 * - 生产环境：仅展示用户友好提示，不泄露内部细节
 * - console.error 记录（可在此接入 Sentry 等监控）
 */
export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 记录错误信息，生产环境可在此接入 Sentry / 监控平台
    console.error("[GlobalErrorBoundary] Uncaught render error:", error);
    console.error("[GlobalErrorBoundary] Component stack:", info.componentStack);

    this.setState({ errorInfo: info });
  }

  /** 重置错误状态并刷新当前页面 */
  private handleReload = (): void => {
    window.location.reload();
  };

  /** 重置错误状态并跳转到首页 */
  private handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo } = this.state;

    return (
      <div className="obsidian-shell min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-slate-950">
        <div className="w-full max-w-xl">
          {/* 错误卡片 */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/70 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/60 dark:border-white/[0.06] shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)] px-8 py-10 text-center">

            {/* 顶部渐变装饰线 */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />

            {/* 图标 */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full blur-xl" />
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center rounded-[1.5rem] bg-red-50/70 dark:bg-red-500/10 dark:border dark:border-red-500/20 shadow-inner backdrop-blur-md">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
            </div>

            {/* 标题与描述 */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
              页面出现了意外错误
            </h1>
            <p className="text-gray-500 dark:text-slate-400 leading-relaxed mb-2 max-w-sm mx-auto">
              UniSearch 遇到了一个未预期的问题，页面无法正常渲染。
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-sm mb-8">
              您的搜索历史和账号数据不受影响。
            </p>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                刷新页面
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-6 py-3 bg-white/60 hover:bg-white/90 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200/60 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 backdrop-blur-sm"
              >
                返回首页
              </button>
            </div>

            {/* 开发模式：错误详情 */}
            {IS_DEV && error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none">
                  🛠 开发模式 — 查看错误详情
                </summary>

                <div className="mt-4 space-y-3">
                  {/* Error message */}
                  <div className="p-4 rounded-xl bg-red-50/80 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 uppercase tracking-wider">
                      Error
                    </p>
                    <p className="text-sm font-mono text-red-700 dark:text-red-300 break-words">
                      {error.message}
                    </p>
                  </div>

                  {/* Stack trace */}
                  {error.stack && (
                    <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-white/[0.06] overflow-auto max-h-48">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                        Stack Trace
                      </p>
                      <pre className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {/* Component stack */}
                  {errorInfo?.componentStack && (
                    <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 overflow-auto max-h-48">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wider">
                        Component Stack
                      </p>
                      <pre className="text-xs font-mono text-amber-700 dark:text-amber-300 whitespace-pre-wrap break-words leading-relaxed">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* 底部装饰线 */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent dark:via-white/[0.04]" />
          </div>

          {/* 底部品牌文字 */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
            UniSearch · 如问题持续出现，请联系管理员
          </p>
        </div>
      </div>
    );
  }
}
