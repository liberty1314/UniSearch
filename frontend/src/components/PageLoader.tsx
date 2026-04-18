import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
    isLoading: boolean;
    onComplete?: () => void;
}

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
                'fixed inset-0 z-[9999] overflow-hidden bg-[#f5f5f7] dark:bg-[#000000] flex flex-col items-center justify-center transition-opacity duration-700 ease-out',
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onTransitionEnd={handleTransitionEnd}
        >
            <div className="flex flex-col items-center animate-in fade-in duration-1000 zoom-in-[0.98]">
                <img
                    src="/Uni.png"
                    alt="UniSearch Logo"
                    className="h-[72px] w-[72px] object-contain mb-10 dark:brightness-110 drop-shadow-sm dark:drop-shadow-none"
                />

                <div 
                    className="h-[3px] w-[200px] overflow-hidden rounded-full bg-[#d2d2d7] dark:bg-[#333336]"
                >
                    <div 
                        className="h-full bg-[#1d1d1f] dark:bg-[#ffffff] transition-[width] duration-300 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="mt-6 opacity-0 animate-in fade-in delay-300 duration-1000 fill-mode-forwards text-center">
                    <p className="text-[12px] font-medium tracking-[0.02em] text-[#1d1d1f]/60 dark:text-white/60">
                        {progress >= 100 ? '启动完成' : '正在唤醒搜索引擎...'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
