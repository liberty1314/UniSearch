import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { homeCardHoverState, homeCardHoverTransition } from "@/components/home/homeCardHoverMotion";

export interface FeatureCardProps {
  title: string;
  description: string;
  Icon: LucideIcon;
  iconGradient: string;
  iconGlow: string;
  accentText: string;
  index: number;
  shouldPlayEntrance?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  Icon,
  iconGradient,
  iconGlow,
  accentText,
  index,
  shouldPlayEntrance = true,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimateEntrance = shouldPlayEntrance && !shouldReduceMotion;

  return (
    <motion.div
      initial={shouldAnimateEntrance ? { opacity: 0, y: 34, rotateX: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 + index * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="group relative h-full cursor-pointer [transform-style:preserve-3d]"
      data-testid="home-feature-card"
    >
      {/* 将悬浮状态置于独立层，避免继承外层错落入场延迟。 */}
      <motion.div
        whileHover={shouldReduceMotion ? undefined : homeCardHoverState}
        transition={homeCardHoverTransition}
        className="h-full [transform-style:preserve-3d]"
        data-testid="home-feature-card-hover-layer"
      >
        <div className="surface-card h-full min-h-[17rem] p-7 flex flex-col sm:min-h-[19rem] sm:p-8">
          {/* 背景光晕点缀 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 top-8 h-40 w-40 rounded-full bg-cyan-100/40 blur-3xl opacity-70 transition-all duration-500 group-hover:scale-125 group-hover:opacity-100 motion-reduce:transition-none dark:bg-cyan-400/[0.06]"
          />

          <div className="relative z-10 flex flex-col h-full">
            <div
              className={`mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br ${iconGradient} text-white ring-2 ring-white/60 transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none ${iconGlow}`}
            >
              <Icon
                className="h-8 w-8 transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                strokeWidth={2}
              />
            </div>

            <h3
              className={`mb-4 text-center text-xl font-bold text-gray-900 transition-all duration-300 dark:text-white sm:text-2xl ${accentText}`}
            >
              {title}
            </h3>

            <p className="text-center text-base leading-8 text-slate-600 dark:text-slate-300/90">
              {description}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeatureCard;
