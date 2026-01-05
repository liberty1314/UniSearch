import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    color?: 'blue' | 'emerald' | 'amber' | 'purple';
    index?: number;
}

const colorClasses = {
    blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        icon: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        icon: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    amber: {
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        icon: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        icon: 'text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    },
};

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'blue',
    index = 0,
}) => {
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative overflow-hidden"
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
                {/* 背景装饰 */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bg} rounded-full blur-3xl opacity-30 -z-0`} />

                <div className="relative z-10">
                    {/* 图标 */}
                    <div className={`inline-flex p-3 rounded-xl ${colors.iconBg} mb-4`}>
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                    </div>

                    {/* 标题 */}
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {title}
                    </p>

                    {/* 数值 */}
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-bold text-slate-800 dark:text-white">
                            {value}
                        </h3>

                        {/* 趋势指示器 */}
                        {trend && (
                            <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${trend.isPositive
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}
                            >
                                {trend.isPositive ? '↑' : '↓'} {trend.value}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
