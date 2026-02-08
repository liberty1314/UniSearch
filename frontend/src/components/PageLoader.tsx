import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageLoaderProps {
    isLoading: boolean;
    onComplete?: () => void;
}

/**
 * 高级页面加载组件
 * 提供流畅的页面加载动画效果，进度条与实际加载同步
 */
const PageLoader: React.FC<PageLoaderProps> = ({ isLoading, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [shouldShow, setShouldShow] = useState(true);

    useEffect(() => {
        if (isLoading) {
            setProgress(0);
            setShouldShow(true);

            // 使用更真实的进度模拟算法
            // 阶段1: 0-60% 快速增长 (前800ms)
            // 阶段2: 60-85% 中速增长 (800-1200ms)
            // 阶段3: 85-95% 慢速增长 (1200-1400ms)
            // 阶段4: 等待实际加载完成才到100%

            const startTime = Date.now();

            const updateProgress = () => {
                const elapsed = Date.now() - startTime;
                let newProgress = 0;

                if (elapsed < 800) {
                    // 阶段1: 快速到60%
                    newProgress = (elapsed / 800) * 60;
                } else if (elapsed < 1200) {
                    // 阶段2: 60% -> 85%
                    newProgress = 60 + ((elapsed - 800) / 400) * 25;
                } else if (elapsed < 1400) {
                    // 阶段3: 85% -> 95%
                    newProgress = 85 + ((elapsed - 1200) / 200) * 10;
                } else {
                    // 阶段4: 保持在95%，等待实际加载完成
                    newProgress = 95;
                }

                setProgress(Math.min(newProgress, 95));
            };

            const interval = setInterval(updateProgress, 50);

            return () => clearInterval(interval);
        } else {
            // 实际加载完成，快速完成剩余进度
            const completeProgress = () => {
                setProgress((prev) => {
                    if (prev >= 100) return 100;
                    const remaining = 100 - prev;
                    return prev + remaining * 0.3; // 每次完成剩余的30%
                });
            };

            const interval = setInterval(completeProgress, 50);

            // 确保到达100%后再开始退出动画
            const checkComplete = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 99.5) {
                        clearInterval(interval);
                        clearInterval(checkComplete);
                        setProgress(100);

                        // 在100%停留100ms，然后触发退出
                        setTimeout(() => {
                            setShouldShow(false);
                        }, 100);
                    }
                    return prev;
                });
            }, 50);

            return () => {
                clearInterval(interval);
                clearInterval(checkComplete);
            };
        }
    }, [isLoading]);

    // 监听退出动画完成
    useEffect(() => {
        if (!shouldShow && !isLoading) {
            // 等待退出动画完成后调用 onComplete
            const timer = setTimeout(() => {
                onComplete?.();
            }, 800); // 0.5s 动画 + 0.3s 延迟
            return () => clearTimeout(timer);
        }
    }, [shouldShow, isLoading, onComplete]);

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
                >
                    {/* 背景装饰 */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* 动态渐变球 */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl"
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 1,
                            }}
                            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-400/30 to-pink-400/30 rounded-full blur-3xl"
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 2,
                            }}
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
                        />
                    </div>

                    {/* 网格背景 */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                    {/* 加载内容 */}
                    <div className="relative z-10 flex flex-col items-center">
                        {/* Logo 动画 */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="mb-8"
                        >
                            {/* Logo 图片 */}
                            <motion.img
                                src="/Uni.png"
                                alt="UniSearch Logo"
                                animate={{
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="w-32 h-32 object-contain"
                            />
                        </motion.div>

                        {/* 品牌名称 */}
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4"
                        >
                            UniSearch
                        </motion.h1>

                        {/* 加载文字 */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="text-gray-600 dark:text-gray-400 text-lg mb-8"
                        >
                            {progress >= 100 ? '加载完成' : '正在加载...'}
                        </motion.p>

                        {/* 进度条 */}
                        <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                animate={{ width: `${progress}%` }}
                                transition={{
                                    duration: 0.3,
                                    ease: "easeOut"
                                }}
                                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full relative"
                            >
                                {/* 进度条光效 */}
                                <motion.div
                                    animate={{
                                        x: ['-100%', '200%'],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                />
                            </motion.div>
                        </div>

                        {/* 进度百分比 */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400"
                        >
                            {Math.round(progress)}%
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PageLoader;
