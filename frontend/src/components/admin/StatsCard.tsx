import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ADMIN_PANEL_SURFACE_CLASSES,
    ADMIN_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/admin/adminDesign';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'nebula';
    index?: number;
}

const colorClasses = {
    nebula: {
        tint: 'from-blue-500/12 to-cyan-500/12',
        icon: 'text-blue-600 dark:text-cyan-300',
        iconBg: 'bg-blue-50/70 dark:bg-cyan-950/25',
    },
    blue: {
        tint: 'from-blue-500/12 to-cyan-500/12',
        icon: 'text-blue-600 dark:text-cyan-300',
        iconBg: 'bg-blue-50/70 dark:bg-cyan-950/25',
    },
    emerald: {
        tint: 'from-emerald-500/12 to-teal-500/12',
        icon: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50/80 dark:bg-emerald-900/25',
    },
    amber: {
        tint: 'from-amber-500/12 to-orange-500/12',
        icon: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50/80 dark:bg-amber-900/25',
    },
    purple: {
        tint: 'from-sky-500/12 to-indigo-500/12',
        icon: 'text-sky-600 dark:text-sky-300',
        iconBg: 'bg-sky-50/80 dark:bg-sky-900/25',
    },
};

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'nebula',
    index = 0,
}) => {
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
        >
            <div
                className={cn(
                    ADMIN_PANEL_SURFACE_CLASSES,
                    ADMIN_PANEL_SURFACE_HOVER_CLASSES,
                    'relative h-full min-w-0 overflow-hidden p-5 sm:p-6'
                )}
            >
                <div className={cn(
                    'pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full blur-3xl opacity-100',
                    `bg-gradient-to-br ${colors.tint}`
                )} />

                <div className="relative z-10 flex h-full flex-col gap-4">
                    <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] border-[0.5px] border-slate-200/50 backdrop-blur-md dark:border-white/10', colors.iconBg)}>
                        <Icon className={cn('h-5 w-5', colors.icon)} />
                    </div>

                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                            {title}
                        </p>
                        <div className="flex items-end justify-between gap-3">
                            <h3 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-slate-800 dark:text-white sm:text-[2rem]">
                                {value}
                            </h3>
                            {trend && (
                                <span
                                    className={cn(
                                        'inline-flex shrink-0 items-center gap-1 rounded-full border-[0.5px] px-2.5 py-1 text-[11px] font-medium backdrop-blur-md',
                                        trend.isPositive
                                            ? 'border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/25 dark:text-emerald-300'
                                            : 'border-rose-200/60 bg-rose-50/60 text-rose-700 dark:border-rose-400/20 dark:bg-rose-950/25 dark:text-rose-300'
                                    )}
                                >
                                    {trend.isPositive ? '↑' : '↓'} {trend.value}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
