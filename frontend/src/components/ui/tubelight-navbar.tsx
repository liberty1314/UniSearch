import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  activeUrl: string;
  className?: string;
  "aria-label"?: string;
}

export function TubelightNavbar({
  items,
  activeUrl,
  className,
  "aria-label": ariaLabel = "主导航",
}: NavBarProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex items-center justify-center",
        className,
      )}
    >
      <div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/60 px-2 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/30">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeUrl === item.url;

          return (
            <Link
              key={item.name}
              to={item.url}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative inline-flex h-10 min-w-10 items-center justify-center gap-2.5 overflow-visible rounded-full px-5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                "text-gray-700 hover:bg-gray-100/80 hover:text-cyan-700 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-cyan-200",
                isActive && "bg-cyan-50 text-cyan-700 shadow-[0_10px_24px_rgba(34,211,238,0.14)] dark:bg-cyan-500/10 dark:text-cyan-200",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.3} />
              <span>{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-cyan-400/5"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-cyan-400">
                    <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-cyan-400/20 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-cyan-400/20 blur-md" />
                    <div className="absolute left-2 top-0 h-4 w-4 rounded-full bg-cyan-300/20 blur-sm" />
                  </div>
                </motion.div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
