import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toStyleVars } from '@/lib/styleVars';

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
                'fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-opacity duration-500 ease-out',
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onTransitionEnd={handleTransitionEnd}
        >
            {/* 背景装饰 - 纯 opacity 动画，无 transform */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"
                />
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse auth-delay-1000"
                >
                </div>
            </div>

            {/* 网格背景 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            {/* 加载内容 - 无任何 transform 动画 */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo */}
                <div className="mb-8">
                    <img
                        src="/Uni.png"
                        alt="UniSearch Logo"
                        className="w-32 h-32 object-contain"
                    />
                </div>

                {/* 品牌名称 */}
                <h1 className="text-4xl font-bold bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-600 bg-clip-text text-transparent mb-4">
                    UniSearch
                </h1>

                {/* 加载文字 */}
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                    {progress >= 100 ? '加载完成' : '正在加载...'}
                </p>

                {/* 进度条 */}
                <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-[width] duration-300 ease-out page-loader-progress"
                        style={toStyleVars({
                            '--page-loader-progress': `${progress}%`,
                        })}
                    />
                </div>

                {/* 进度百分比 */}
                <div className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {Math.round(progress)}%
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
