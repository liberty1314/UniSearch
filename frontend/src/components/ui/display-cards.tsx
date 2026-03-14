"use client";

import { cn } from "@/lib/utils";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
}

function DisplayCard({
  className,
  icon,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-blue-500",
  titleClassName = "text-blue-500",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] -skew-y-[6deg] select-none flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-700 after:absolute after:inset-0 after:rounded-xl after:opacity-0 after:transition-opacity hover:-translate-y-10 hover:skew-y-0 hover:gap-y-3 hover:bg-white/10 hover:after:opacity-100 grayscale-[100%] hover:grayscale-0 dark:border-slate-700/30 dark:bg-slate-900/30 dark:hover:bg-slate-800/50",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("relative inline-block rounded-full p-1.5", iconClassName)}>
          {icon}
        </span>
        <p className={cn("text-base font-semibold", titleClassName)}>{title}</p>
      </div>
      <div>
        <p className="whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">{description}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{date}</p>
      </div>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      icon: null,
      title: "Featured",
      description: "Amazing content",
      date: "Just now",
      iconClassName: "bg-blue-500/10 text-blue-500",
      titleClassName: "text-blue-500",
      className: "[grid-area:stack] hover:-translate-y-10 hover:-rotate-12 hover:translate-x-12",
    },
    {
      icon: null,
      title: "Popular",
      description: "Trending this week",
      date: "2 days ago",
      iconClassName: "bg-teal-500/10 text-teal-500",
      titleClassName: "text-teal-500",
      className: "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-12",
    },
    {
      icon: null,
      title: "New",
      description: "Latest updates",
      date: "Today",
      iconClassName: "bg-amber-500/10 text-amber-500",
      titleClassName: "text-amber-500",
      className: "[grid-area:stack] translate-x-24 translate-y-20 hover:-translate-y-14",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid place-items-center [grid-template-areas:'stack'] mr-24">
      {displayCards.map((card, idx) => (
        <DisplayCard key={idx} {...card} />
      ))}
    </div>
  );
}
