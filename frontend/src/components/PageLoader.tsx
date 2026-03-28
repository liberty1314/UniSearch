import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toStyleVars } from '@/lib/styleVars';
import { BLUE_CYAN_GRADIENT } from '@/lib/brandTheme';

interface PageLoaderProps {
    isLoading: boolean;
    onComplete?: () => void;
}

const STATUS_ITEMS = [
    { label: '主题', threshold: 32 },
    { label: '导航', threshold: 64 },
    { label: '搜索', threshold: 92 },
] as const;

/**
 * 页面加载组件 - 纯 opacity 过渡，零 transform
 * 使用 CSS transition 实现，避免任何布局偏移
 */
const PageLoader: React.FC<PageLoaderProps> = ({ isLoading, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(true);

    const pendingStatusIndex = STATUS_ITEMS.findIndex((item) => progress < item.threshold);
    const activeStatusIndex = progress >= 100
        ? STATUS_ITEMS.length - 1
        : pendingStatusIndex === -1
            ? STATUS_ITEMS.length - 1
            : pendingStatusIndex;

    // 进度模拟
    useEffect(() => {
        if (!isLoading) return;

        setProgress(0);
        setVisible(true);

        const startTime = Date.now();

        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            let p = 0;

            if (elapsed < 600) {
                p = (elapsed / 600) * 65;
            } else if (elapsed < 900) {
                p = 65 + ((elapsed - 600) / 300) * 20;
            } else {
                p = 85 + Math.min((elapsed - 900) / 500, 1) * 10;
            }

            setProgress(Math.min(p, 95));
        };

        const interval = setInterval(updateProgress, 40);
        return () => clearInterval(interval);
    }, [isLoading]);

    // 加载完成 → 快速补满进度条 → 淡出
    useEffect(() => {
        if (isLoading || !visible) return;

        // 快速完成到 100%
        setProgress(100);

        // 200ms 后开始淡出（让用户看到 100%）
        const fadeTimer = setTimeout(() => {
            setVisible(false);
        }, 200);

        return () => clearTimeout(fadeTimer);
    }, [isLoading, visible]);

    // 淡出动画完成后通知
    const handleTransitionEnd = useCallback(() => {
        if (!visible) {
            onComplete?.();
        }
    }, [visible, onComplete]);

    return (
        <div
            className={cn(
                'fixed inset-0 z-[9999] overflow-hidden bg-white dark:bg-[#020617] bg-[radial-gradient(circle_at_top,rgba(148,214,255,0.26),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(191,229,255,0.24),transparent_32%),linear-gradient(180deg,#fbfdff_0%,#f3f8ff_46%,#eef6ff_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.08),transparent_18%),linear-gradient(180deg,#020617_0%,#081323_46%,#082235_100%)] transition-opacity duration-500 ease-out',
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onTransitionEnd={handleTransitionEnd}
        >
            <div className="absolute inset-0">
                <div className="absolute inset-x-[26%] top-0 h-44 bg-[radial-gradient(circle,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0)_74%)] opacity-90 blur-3xl dark:bg-[radial-gradient(circle,rgba(103,232,249,0.14)_0%,rgba(103,232,249,0)_74%)]" />
                <div className="absolute inset-x-[24%] bottom-[-7rem] h-64 bg-[radial-gradient(circle,rgba(191,229,255,0.45)_0%,rgba(191,229,255,0)_72%)] opacity-70 blur-3xl dark:bg-[radial-gradient(circle,rgba(8,145,178,0.14)_0%,rgba(8,145,178,0)_72%)]" />
            </div>

            <div className="page-loader-grid absolute inset-0 opacity-70 dark:opacity-15" />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pb-28 pt-10 sm:px-10 sm:pb-32">
                <div
                    data-testid="page-loader-stage"
                    className="relative flex w-full max-w-[30rem] flex-col items-center"
                >
                    <div className="pointer-events-none absolute inset-x-8 top-[18%] h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent dark:via-cyan-400/10" />

                    <div className="relative flex h-[18rem] w-full items-center justify-center sm:h-[20rem]">
                        <div className="absolute h-[13rem] w-[13rem] rounded-full bg-sky-200/30 blur-3xl dark:bg-cyan-400/5" />
                        <div
                            data-testid="page-loader-orbit"
                            className="page-loader-orbit absolute h-[12.5rem] w-[12.5rem] rounded-full border border-sky-200/80 motion-reduce:animate-none dark:border-cyan-400/10"
                        />
                        <div className="absolute h-[10.4rem] w-[10.4rem] rounded-full border border-sky-100/90 bg-white/60 shadow-[0_16px_40px_rgba(120,169,214,0.08)] backdrop-blur-2xl dark:border-white/[0.04] dark:bg-slate-950/40" />
                        <div className="page-loader-scan-ring absolute h-[11.25rem] w-[11.25rem] rounded-full motion-reduce:animate-none" />
                        <div className="absolute h-[8.9rem] w-[8.9rem] rounded-full border border-sky-100/70 bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.78)_56%,rgba(255,255,255,0.4)_100%)] dark:border-white/[0.03] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.02)_0%,rgba(15,23,42,0.4)_68%,rgba(2,6,23,0.82)_100%)]" />

                        <div
                            data-testid="page-loader-core-shell"
                            className="page-loader-core-shell relative flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-full border border-sky-100/95 bg-white/88 shadow-[0_18px_40px_rgba(148,195,237,0.18)] backdrop-blur-xl dark:border-cyan-300/[0.08] dark:bg-[linear-gradient(180deg,#0a1324_0%,#020617_100%)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
                        >
                            <div className="absolute inset-[0.55rem] rounded-full border border-sky-100/85 dark:border-cyan-300/[0.04]" />
                            <img
                                src="/Uni.png"
                                alt="UniSearch Logo"
                                className="relative z-10 h-20 w-20 object-contain drop-shadow-[0_10px_20px_rgba(59,130,246,0.12)]"
                            />
                        </div>
                    </div>

                    <div className="mt-2 flex flex-col items-center text-center">
                        <p className="mb-3 text-[0.68rem] font-medium uppercase tracking-[0.46em] text-slate-400 dark:text-slate-500/80">
                            启动序列
                        </p>
                        <div
                            aria-live="polite"
                            className="mt-2 flex w-full max-w-[22rem] flex-col items-center gap-3"
                        >
                            <p className="text-[1.05rem] font-medium tracking-[0.12em] text-slate-700 dark:text-slate-200">
                                {progress >= 100 ? '启动完成' : '正在唤醒搜索引擎'}
                            </p>
                            <p className="text-[0.82rem] tracking-[0.18em] text-slate-500 dark:text-slate-500">
                                {progress >= 100 ? '即将进入 UniSearch 工作区' : '同步导航、主题与搜索能力'}
                            </p>
                        </div>

                        <div
                            data-testid="page-loader-status-row"
                            className="page-loader-status-row mt-6 flex items-center justify-center gap-4 rounded-full border border-white/75 bg-white/62 px-4 py-2 shadow-[0_12px_30px_rgba(148,195,237,0.1)] backdrop-blur-xl dark:border-white/[0.04] dark:bg-[#020617]/50 dark:shadow-[0_8px_20px_rgba(0,0,0,0.5)] sm:gap-5"
                        >
                            {STATUS_ITEMS.map((item, index) => {
                                const isComplete = progress >= item.threshold;
                                const isActive = progress < 100 && index === activeStatusIndex;

                                return (
                                    <div
                                        key={item.label}
                                        className={cn(
                                            'page-loader-status-item flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.22em] text-slate-400 transition-colors duration-300 dark:text-slate-500',
                                            isComplete && 'text-slate-600 dark:text-slate-300',
                                            isActive && 'text-sky-600 dark:text-cyan-300'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'h-1.5 w-1.5 rounded-full border border-sky-200/80 bg-white/70 transition-all duration-300 dark:border-cyan-300/20 dark:bg-slate-900',
                                                isComplete && 'border-sky-400/60 bg-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.3)] dark:border-cyan-300/30 dark:bg-cyan-300/70',
                                                isActive && 'scale-110 border-sky-500/50 bg-sky-500 shadow-[0_0_16px_rgba(14,165,233,0.36)] dark:border-cyan-300/30 dark:bg-cyan-300'
                                            )}
                                        />
                                        <span>{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                <div
                    data-testid="page-loader-bottom-progress"
                    className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-4xl px-6 sm:px-10"
                    style={{ paddingBottom: 'calc(1.25rem + var(--safe-area-inset-bottom))' }}
                >
                    <div className="page-loader-progress-shell rounded-[1.4rem] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_18px_40px_rgba(148,195,237,0.1)] backdrop-blur-2xl dark:border-white/[0.04] dark:bg-[#020617]/50 dark:shadow-[0_18px_40px_rgba(0,0,0,0.5)] sm:px-5">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="min-w-0 shrink-0">
                                <p className="text-[0.56rem] uppercase tracking-[0.36em] text-slate-400 dark:text-slate-500">
                                    启动流程
                                </p>
                                <p className="mt-1 text-[0.76rem] font-semibold uppercase tracking-[0.22em] text-slate-700 dark:text-slate-200">
                                    {progress >= 100 ? '已就绪' : '搜索核心'}
                                </p>
                            </div>

                            <div
                                data-testid="page-loader-progress-track"
                                className="page-loader-progress-rail relative h-2 min-w-0 flex-1 overflow-hidden rounded-full border border-slate-200/90 bg-slate-200/75 dark:border-white/10 dark:bg-white/10"
                            >
                                <div className="page-loader-progress-rail-noise absolute inset-0" />
                                <div
                                    className={cn('page-loader-progress page-loader-progress-fill relative h-full rounded-full transition-[width] duration-300 ease-out', BLUE_CYAN_GRADIENT)}
                                    style={toStyleVars({
                                        '--page-loader-progress': `${progress}%`,
                                    })}
                                />
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="text-[0.56rem] uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
                                    进度
                                </p>
                                <p className="mt-1 text-[0.88rem] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                    {Math.round(progress)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
