import { cn } from "@/lib/utils";

export const hotToolbarRailClassName =
  "flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const buildHotToolbarTabClassName = (active: boolean, activeClassName: string, disabled?: boolean) => cn(
  "inline-flex min-h-12 min-w-[5.25rem] flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold leading-none transition-all duration-200 md:min-w-0",
  active
    ? activeClassName
    : cn(
        "bg-white/72 text-slate-600 dark:bg-slate-950/[0.48] dark:text-slate-300",
        !disabled && "hover:border-cyan-200 hover:bg-white hover:text-slate-900 dark:hover:border-cyan-400/[0.24] dark:hover:bg-cyan-400/[0.08] dark:hover:text-white"
      ),
  disabled && "opacity-40 cursor-not-allowed"
);

export const hotToolbarHintClassName =
  "mt-2 px-2 text-[12px] leading-5 text-slate-400 dark:text-slate-300";
