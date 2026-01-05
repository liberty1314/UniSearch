import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
    className?: string;
    variant?: 'card' | 'list' | 'text' | 'circle';
    count?: number;
    animate?: boolean;
}

/**
 * 骨架屏加载组件
 * 提供优雅的内容加载占位效果
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    className,
    variant = 'card',
    count = 1,
    animate = true,
}) => {
    const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';

    const variants = {
        card: 'h-48 rounded-2xl',
        list: 'h-20 rounded-xl',
        text: 'h-4 rounded',
        circle: 'w-12 h-12 rounded-full',
    };

    const shimmerAnimation = animate ? {
        backgroundPosition: ['200% 0', '-200% 0'],
    } : {};

    const items = Array.from({ length: count }, (_, i) => (
        <motion.div
            key={i}
            className={cn(baseClasses, variants[variant], className)}
            style={{
                backgroundSize: '200% 100%',
            }}
            animate={shimmerAnimation}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.1,
            }}
        />
    ));

    return count === 1 ? items[0] : <>{items}</>;
};

/**
 * 搜索结果骨架屏
 */
export const SearchResultsSkeleton: React.FC<{ viewMode?: 'grid' | 'list' }> = ({
    viewMode = 'grid'
}) => {
    return (
        <div className={cn(
            viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-6'
        )}>
            {Array.from({ length: 8 }, (_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="p-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-apple rounded-3xl border border-gray-200/60 dark:border-gray-700/60"
                >
                    <div className="space-y-4">
                        {/* 标题骨架 */}
                        <div className="space-y-2">
                            <SkeletonLoader variant="text" className="w-full" />
                            <SkeletonLoader variant="text" className="w-3/4" />
                        </div>

                        {/* 底部信息骨架 */}
                        <div className="flex items-center justify-between pt-2">
                            <SkeletonLoader variant="text" className="w-24 h-6 rounded-full" />
                            <SkeletonLoader variant="text" className="w-16 h-5 rounded-full" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

/**
 * 首页特性卡片骨架屏
 */
export const FeatureCardsSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.from({ length: 3 }, (_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-apple rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50"
                >
                    <div className="space-y-6">
                        {/* 图标骨架 */}
                        <SkeletonLoader variant="circle" className="w-16 h-16 mx-auto" />

                        {/* 标题骨架 */}
                        <SkeletonLoader variant="text" className="w-32 h-6 mx-auto" />

                        {/* 描述骨架 */}
                        <div className="space-y-2">
                            <SkeletonLoader variant="text" className="w-full" />
                            <SkeletonLoader variant="text" className="w-full" />
                            <SkeletonLoader variant="text" className="w-3/4 mx-auto" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default SkeletonLoader;
