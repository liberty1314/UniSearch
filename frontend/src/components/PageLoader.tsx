import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
    isLoading: boolean;
    onComplete?: () => void;
}

const PageLoader: React.FC<PageLoaderProps> = ({ isLoading, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(true);

    const stageLabels = ['搜索核心', '主题', '导航', '搜索'];

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

        setProgress(100);

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
                'fixed inset-0 z-[9999] overflow-hidden bg-[#f5f5f7] dark:bg-[#000000] transition-opacity duration-700 ease-out',
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onTransitionEnd={handleTransitionEnd}
        >
            <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_28%),radial-gradient(circle_at_bottom,rgba(6,182,212,0.12),transparent_24%)]" />

                <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-1000 zoom-in-[0.98]">
                    <div
                        data-testid="page-loader-orbit"
                        className="relative mb-10 flex h-36 w-36 items-center justify-center rounded-full border border-white/50 bg-white/45 shadow-[0_32px_80px_rgba(37,99,235,0.12)] backdrop-blur-3xl motion-reduce:animate-none dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_32px_80px_rgba(8,145,178,0.16)]"
                    >
                        <div className="absolute inset-3 rounded-full border border-blue-200/60 dark:border-cyan-900/50" />
                        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,rgba(56,189,248,0.08),rgba(59,130,246,0.35),rgba(6,182,212,0.5),rgba(56,189,248,0.08))] blur-xl motion-safe:animate-spin motion-reduce:animate-none" />
                        <div
                            data-testid="page-loader-core-shell"
                            className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-white via-blue-50 to-cyan-50 shadow-[0_16px_40px_rgba(37,99,235,0.16)] dark:border-white/10 dark:from-slate-900 dark:via-blue-950 dark:to-cyan-950"
                        >
                            <img
                                src="/Uni.png"
                                alt="UniSearch Logo"
                                className="h-[52px] w-[52px] object-contain dark:brightness-110"
                            />
                        </div>
                    </div>

                    <div className="mb-5 text-center">
                        <p
                            data-testid="page-loader-stage"
                            className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
                        >
                            {progress >= 100 ? '启动完成' : '正在唤醒搜索引擎'}
                        </p>
                        <p className="mt-3 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                            {progress >= 100 ? '即将进入 UniSearch 工作区' : '同步导航、主题与搜索能力'}
                        </p>
                    </div>

                    <div
                        data-testid="page-loader-status-row"
                        className="mb-10 flex flex-wrap items-center justify-center gap-2"
                    >
                        {stageLabels.map((label) => (
                            <span
                                key={label}
                                className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
                            >
                                {label}
                            </span>
                        ))}
                        {progress >= 100 ? (
                            <span className="inline-flex items-center rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1 text-[11px] font-semibold text-cyan-700 shadow-sm dark:border-cyan-900/40 dark:bg-cyan-950/40 dark:text-cyan-300">
                                已就绪
                            </span>
                        ) : null}
                    </div>
                </div>

                <div
                    data-testid="page-loader-bottom-progress"
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white/70 px-6 py-5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70"
                >
                    <div className="mx-auto flex max-w-5xl items-center gap-5">
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                <span>{progress >= 100 ? '当前进度' : '当前进度'}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div
                                data-testid="page-loader-progress-track"
                                className="h-[4px] overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800"
                            >
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-500 transition-[width] duration-300 ease-out motion-reduce:animate-none"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
