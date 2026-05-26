import React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SourceFocusMenuProps {
  open: boolean;
  sourceName: string;
  x: number;
  y: number;
  selected: boolean;
  onSelectOnly: () => void;
  onToggle: () => void;
  onSelectAll: () => void;
  onClose: () => void;
}

const SourceFocusMenu: React.FC<SourceFocusMenuProps> = ({
  open,
  sourceName,
  x,
  y,
  selected,
  onSelectOnly,
  onToggle,
  onSelectAll,
  onClose,
}) => {
  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-source-focus-menu]")) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const runAction = (action: () => void) => {
    action();
    onClose();
  };

  return createPortal(
    <div
      data-source-focus-menu
      role="menu"
      aria-label={`${sourceName}来源操作`}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      className="fixed z-[70] w-[220px] rounded-[1.2rem] border border-slate-200/70 bg-white/92 p-2 text-sm text-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.16)] outline-none backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/88 dark:text-slate-100"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
          来源操作
        </p>
        <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">
          {sourceName}
        </p>
      </div>

      {[
        {
          label: "仅看此源",
          markerClassName: "bg-cyan-500",
          onClick: onSelectOnly,
        },
        {
          label: selected ? "取消选择" : "加入选择",
          markerClassName: "bg-slate-400",
          onClick: onToggle,
        },
        {
          label: "选择全部来源",
          markerClassName: "bg-emerald-500",
          onClick: onSelectAll,
        },
      ].map(({ label, markerClassName, onClick }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          onClick={() => runAction(onClick)}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors",
            "hover:bg-cyan-50 hover:text-cyan-700 focus-visible:bg-cyan-50 focus-visible:text-cyan-700 focus-visible:outline-none",
            "dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100 dark:focus-visible:bg-cyan-400/10 dark:focus-visible:text-cyan-100",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("h-2 w-2 rounded-full", markerClassName)}
          />
          <span>{label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
};

export default SourceFocusMenu;
