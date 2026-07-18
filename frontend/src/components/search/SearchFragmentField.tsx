import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { SearchVisualPhase } from "@/components/search/searchTransitionModel";
import { cn } from "@/lib/utils";

interface SearchFragmentFieldProps {
  phase: SearchVisualPhase;
  completedSources: number;
  totalSources: number;
  receivedBatches: number;
  focused: boolean;
  inputSignal: number;
}

const fragments = [
  {
    position: "left-[5%] top-[18%]",
    size: "h-14 w-12",
    color: "bg-[#246BFD]",
    clipPath: "polygon(12% 8%, 100% 0, 78% 100%, 0 72%)",
    compact: true,
    x: 42,
    y: 54,
    rotate: 18,
  },
  {
    position: "left-[16%] top-[64%]",
    size: "h-10 w-16",
    color: "bg-[#20C7B5]",
    clipPath: "polygon(0 18%, 82% 0, 100% 82%, 18% 100%)",
    compact: true,
    x: 76,
    y: -38,
    rotate: -16,
  },
  {
    position: "right-[7%] top-[22%]",
    size: "h-16 w-14",
    color: "bg-[#FF7A59]",
    clipPath: "polygon(22% 0, 100% 24%, 72% 100%, 0 78%)",
    compact: true,
    x: -48,
    y: 42,
    rotate: -22,
  },
  {
    position: "right-[18%] top-[68%]",
    size: "h-12 w-12",
    color: "bg-[#D7F171]",
    clipPath: "polygon(50% 0, 100% 42%, 68% 100%, 0 76%, 12% 18%)",
    compact: true,
    x: -68,
    y: -46,
    rotate: 24,
  },
  {
    position: "left-[38%] top-[8%]",
    size: "h-8 w-14",
    color: "bg-[#20C7B5]",
    clipPath: "polygon(0 34%, 88% 0, 100% 76%, 18% 100%)",
    compact: true,
    x: 18,
    y: 68,
    rotate: 12,
  },
  {
    position: "right-[38%] bottom-[5%]",
    size: "h-9 w-16",
    color: "bg-[#246BFD]",
    clipPath: "polygon(14% 0, 100% 28%, 78% 100%, 0 66%)",
    compact: true,
    x: -22,
    y: -62,
    rotate: -12,
  },
  {
    position: "left-[2%] top-[46%]",
    size: "h-8 w-10",
    color: "bg-[#D7F171]",
    clipPath: "polygon(0 0, 100% 18%, 72% 100%, 18% 82%)",
    compact: false,
    x: 92,
    y: 0,
    rotate: 28,
  },
  {
    position: "right-[2%] top-[48%]",
    size: "h-11 w-9",
    color: "bg-[#20C7B5]",
    clipPath: "polygon(20% 0, 100% 12%, 76% 100%, 0 68%)",
    compact: false,
    x: -94,
    y: -4,
    rotate: -24,
  },
  {
    position: "left-[27%] top-[28%]",
    size: "h-7 w-9",
    color: "bg-[#FF7A59]",
    clipPath: "polygon(0 22%, 80% 0, 100% 88%, 18% 100%)",
    compact: false,
    x: 46,
    y: 22,
    rotate: 18,
  },
  {
    position: "right-[28%] top-[30%]",
    size: "h-8 w-8",
    color: "bg-[#D7F171]",
    clipPath: "polygon(48% 0, 100% 46%, 64% 100%, 0 72%, 10% 18%)",
    compact: false,
    x: -44,
    y: 20,
    rotate: -18,
  },
  {
    position: "left-[31%] bottom-[18%]",
    size: "h-6 w-12",
    color: "bg-[#246BFD]",
    clipPath: "polygon(0 36%, 84% 0, 100% 68%, 16% 100%)",
    compact: false,
    x: 36,
    y: -24,
    rotate: -10,
  },
  {
    position: "right-[31%] bottom-[20%]",
    size: "h-8 w-10",
    color: "bg-[#FF7A59]",
    clipPath: "polygon(18% 0, 100% 20%, 74% 100%, 0 76%)",
    compact: false,
    x: -38,
    y: -28,
    rotate: 12,
  },
] as const;

const activePhases: SearchVisualPhase[] = [
  "submitting",
  "collecting",
  "revealing",
  "fallback",
];

const SearchFragmentField: React.FC<SearchFragmentFieldProps> = ({
  phase,
  completedSources,
  totalSources,
  receivedBatches,
  focused,
  inputSignal,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const completed = Math.max(0, Math.min(completedSources, totalSources));
  const isActive = activePhases.includes(phase);

  return (
    <div
      data-testid="search-fragment-field"
      data-reduced-motion={shouldReduceMotion ? "true" : "false"}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {fragments.map((fragment, index) => {
        const state = isActive
          ? index < completed
            ? "complete"
            : index < Math.max(totalSources, 1)
              ? "active"
              : "idle"
          : "idle";
        const isInputPulse = inputSignal > 0 && index === inputSignal % 6;
        const progressPulse = receivedBatches > 0 && index === receivedBatches % 6;

        return (
          <motion.span
            key={`${fragment.position}-${index}`}
            data-testid={`search-fragment-${index}`}
            data-state={state}
            data-mobile-hidden={fragment.compact ? "false" : "true"}
            className={cn(
              "absolute block opacity-70 shadow-[0_10px_26px_rgba(15,23,42,0.08)] will-change-transform",
              fragment.position,
              fragment.size,
              fragment.color,
              !fragment.compact && "hidden sm:block",
            )}
            style={{ clipPath: fragment.clipPath }}
            initial={false}
            animate={shouldReduceMotion
              ? { opacity: state === "complete" ? 0.9 : 0.55 }
              : {
                  x: isActive
                    ? fragment.x
                    : focused
                      ? fragment.x * 0.18
                      : [0, fragment.x * 0.04, 0],
                  y: isActive
                    ? fragment.y
                    : focused
                      ? fragment.y * 0.18
                      : [0, fragment.y * 0.04, 0],
                  rotate: isActive
                    ? fragment.rotate
                    : focused
                      ? fragment.rotate * 0.2
                      : 0,
                  scale: isInputPulse || progressPulse
                    ? 1.08
                    : state === "complete"
                      ? 0.92
                      : 1,
                  opacity: state === "complete"
                    ? 0.92
                    : state === "active"
                      ? 0.78
                      : 0.52,
                }}
            exit={shouldReduceMotion
              ? { opacity: 0 }
              : {
                  x: fragment.x,
                  y: fragment.y,
                  rotate: fragment.rotate,
                  scale: 0.9,
                  opacity: 0,
                }}
            transition={isActive || focused
              ? {
                  duration: isActive ? 0.32 : 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }
              : {
                  duration: 6 + (index % 4),
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }}
          />
        );
      })}
    </div>
  );
};

export default SearchFragmentField;
