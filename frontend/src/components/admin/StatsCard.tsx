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
        tint: 'from-blue-500/16 via-sky-400/10 to-cyan-500/14',
        icon: 'text-blue-600 dark:text-cyan-300',
        iconBg: 'bg-blue-50/85 dark:bg-cyan-950/30',
        line: 'via-cyan-300/55',
    },
    blue: {
        tint: 'from-blue-500/16 via-sky-400/10 to-cyan-500/14',
        icon: 'text-blue-600 dark:text-cyan-300',
        iconBg: 'bg-blue-50/85 dark:bg-cyan-950/30',
        line: 'via-cyan-300/55',
    },
    emerald: {
        tint: 'from-emerald-500/16 via-teal-400/10 to-cyan-400/12',
        icon: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50/85 dark:bg-emerald-900/25',
        line: 'via-emerald-300/50',
    },
    amber: {
        tint: 'from-amber-500/16 via-orange-400/10 to-yellow-400/12',
        icon: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50/85 dark:bg-amber-900/25',
        line: 'via-amber-300/50',
    },
    purple: {
        tint: 'from-cyan-500/16 via-blue-400/10 to-violet-400/12',
        icon: 'text-cyan-700 dark:text-cyan-300',
        iconBg: 'bg-cyan-50/85 dark:bg-cyan-950/25',
        line: 'via-blue-300/50',
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
                    'group relative h-full min-w-0 overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 sm:p-6'
                )}
            >
                <div className={cn(
                    'pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl opacity-100 transition-transform duration-500 group-hover:scale-125',
                    `bg-gradient-to-br ${colors.tint}`
                )} />
                <div className={cn('pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent', colors.line)} />

                <div className="relative z-10 flex h-full flex-col gap-5">
                    <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-[1.15rem] border-[0.5px] border-white/70 shadow-[0_14px_30px_rgba(14,165,233,0.10)] backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-0.5 dark:border-cyan-300/[0.12]', colors.iconBg)}>
                        <Icon className={cn('h-5 w-5', colors.icon)} />
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-400">
                            {title}
                        </p>
                        <div className="flex items-end justify-between gap-3">
                            <h3 className="min-w-0 truncate text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[2.15rem]">
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
