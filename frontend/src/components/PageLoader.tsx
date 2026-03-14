import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toStyleVars } from '@/lib/styleVars';
import { BLUE_CYAN_GRADIENT } from '@/lib/brandTheme';

interface PageLoaderProps {
    isLoading: boolean;
    onComplete?: () => void;
}

/**
 * 页面加载组件 - 纯 opacity 过渡，零 transform
 * 使用 CSS transition 实现，避免任何布局偏移
 */
const PageLoader: React.FC<PageLoaderProps> = ({ isLoading, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(true);

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
                'fixed inset-0 z-[9999] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.24),transparent_18%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#edf5ff_48%,#ecfeff_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_18%),radial-gradient(circle_at_20%_80%,rgba(37,99,235,0.22),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(8,145,178,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#08101f_42%,#082f49_100%)] transition-opacity duration-500 ease-out',
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onTransitionEnd={handleTransitionEnd}
        >
            <div className="absolute inset-0">
                <div
                    className="absolute inset-x-[18%] top-0 h-56 bg-[radial-gradient(circle,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0)_72%)] opacity-75 blur-3xl dark:bg-[radial-gradient(circle,rgba(103,232,249,0.22)_0%,rgba(103,232,249,0)_72%)] dark:opacity-100"
                />
                <div
                    className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/18 via-blue-200/10 to-transparent blur-3xl motion-reduce:animate-none animate-pulse dark:from-blue-500/14 dark:via-cyan-400/10"
                />
                <div
                    className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-300/20 via-blue-200/8 to-transparent blur-3xl motion-reduce:animate-none animate-pulse auth-delay-1000 dark:from-cyan-500/14 dark:via-blue-500/10"
                />
            </div>

            <div className="page-loader-grid absolute inset-0 opacity-80 dark:opacity-60" />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pb-32 pt-10 sm:px-10 sm:pb-36">
                <div
                    data-testid="page-loader-stage"
                    className="relative flex w-full max-w-[38rem] flex-col items-center"
                >
                    <div className="pointer-events-none absolute inset-x-8 top-[16%] h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent dark:via-cyan-400/35" />

                    <div className="relative flex h-[23rem] w-full items-center justify-center sm:h-[26rem]">
                        <div className="absolute h-[18rem] w-[18rem] rounded-full bg-cyan-300/18 blur-3xl dark:bg-cyan-400/14" />
                        <div className="absolute h-[24rem] w-[24rem] rounded-full border border-white/45 dark:border-white/10" />
                        <div className="absolute h-[19rem] w-[19rem] rounded-full border border-cyan-300/28 dark:border-cyan-400/18" />
                        <div
                            data-testid="page-loader-orbit"
                            className="page-loader-orbit absolute h-[20.75rem] w-[20.75rem] rounded-full border border-cyan-300/35 motion-reduce:animate-none dark:border-cyan-400/25"
                        />
                        <div className="page-loader-orbit-glow absolute h-[21.5rem] w-[21.5rem] rounded-full motion-reduce:animate-none" />
                        <div className="page-loader-scan-ring absolute h-[20.75rem] w-[20.75rem] rounded-full motion-reduce:animate-none" />
                        <div className="page-loader-scan-ring page-loader-delay-strong absolute h-[17rem] w-[17rem] rounded-full opacity-60 motion-reduce:animate-none" />

                        <div className="absolute h-[15rem] w-[15rem] rounded-full border border-white/75 bg-white/60 shadow-[0_30px_100px_rgba(14,165,233,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_30px_100px_rgba(8,145,178,0.24)]" />
                        <div className="absolute h-[13rem] w-[13rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.66)_44%,rgba(255,255,255,0)_76%)] dark:bg-[radial-gradient(circle,rgba(103,232,249,0.16)_0%,rgba(15,23,42,0.12)_42%,rgba(2,6,23,0)_76%)]" />

                        <div className="relative flex h-[9.75rem] w-[9.75rem] items-center justify-center rounded-full border border-cyan-200/60 bg-white/80 shadow-[0_12px_40px_rgba(59,130,246,0.12)] backdrop-blur-xl dark:border-cyan-400/20 dark:bg-slate-950/74 dark:shadow-[0_18px_48px_rgba(8,145,178,0.2)]">
                            <div className="absolute inset-2 rounded-full border border-cyan-200/40 dark:border-cyan-300/12" />
                            <img
                                src="/Uni.png"
                                alt="UniSearch Logo"
                                className="relative z-10 h-24 w-24 object-contain drop-shadow-[0_8px_18px_rgba(59,130,246,0.18)]"
                            />
                        </div>
                    </div>

                    <div className="mt-1 flex flex-col items-center text-center">
                        <p className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.52em] text-slate-400 dark:text-slate-500">
                            Boot Sequence
                        </p>
                        <div
                            aria-live="polite"
                            className="mt-2 flex w-full max-w-[24rem] flex-col items-center gap-3"
                        >
                            <p className="text-lg font-medium tracking-[0.08em] text-slate-700 dark:text-slate-100">
                                {progress >= 100 ? '启动完成' : '正在唤醒搜索引擎'}
                            </p>
                            <p className="text-sm tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                {progress >= 100 ? '即将进入 UniSearch 工作区' : '同步导航、主题与搜索能力'}
                            </p>
                        </div>
                    </div>

                </div>

                <div
                    data-testid="page-loader-bottom-progress"
                    className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-5xl px-6 sm:px-10"
                    style={{ paddingBottom: 'calc(1.5rem + var(--safe-area-inset-bottom))' }}
                >
                    <div className="page-loader-progress-shell rounded-[1.75rem] border border-white/70 bg-white/55 px-4 py-4 shadow-[0_24px_70px_rgba(14,165,233,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[0_24px_70px_rgba(8,145,178,0.2)] sm:px-6">
                        <div className="flex items-center gap-3 sm:gap-5">
                            <div className="min-w-0 shrink-0">
                                <p className="text-[0.62rem] uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
                                    Boot Flow
                                </p>
                                <p className="mt-1 text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-slate-700 dark:text-slate-200">
                                    {progress >= 100 ? 'Ready' : 'Search Core'}
                                </p>
                            </div>

                            <div
                                data-testid="page-loader-progress-track"
                                className="page-loader-progress-rail relative h-3 min-w-0 flex-1 overflow-hidden rounded-full border border-slate-200/80 bg-slate-200/75 dark:border-white/10 dark:bg-white/10"
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
                                <p className="text-[0.62rem] uppercase tracking-[0.36em] text-slate-400 dark:text-slate-500">
                                    Progress
                                </p>
                                <p className="mt-1 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
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
