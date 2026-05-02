import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

export interface FeatureCardProps {
  title: string;
  description: string;
  Icon: LucideIcon;
  iconGradient: string;
  iconGlow: string;
  accentText: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  Icon,
  iconGradient,
  iconGlow,
  accentText,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
      className="group relative cursor-pointer h-full"
    >
      <div className="glass-card-premium h-full p-8 flex flex-col">
        {/* 背景光晕点缀 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-10 h-32 w-32 rounded-full bg-white/30 blur-3xl transition-all duration-500 group-hover:scale-110 group-hover:opacity-100 dark:bg-white/[0.03]"
        />

        <div className="relative z-10 flex flex-col h-full">
          <div
            className={`mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br ${iconGradient} text-white ring-2 ring-white/60 transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-110 group-hover:rotate-6 ${iconGlow}`}
          >
            <Icon
              className="h-8 w-8 transition-transform duration-300 group-hover:scale-105"
              strokeWidth={2}
            />
          </div>

          <h3
            className={`mb-4 text-center text-xl font-bold text-gray-900 transition-all duration-300 dark:text-white ${accentText}`}
          >
            {title}
          </h3>

          <p className="text-center leading-relaxed text-slate-600 dark:text-slate-300/90 text-[15px]">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default FeatureCard;
