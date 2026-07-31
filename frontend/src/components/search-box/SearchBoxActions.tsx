import React from "react";
import {
  Button as StatefulButton,
  StatefulButtonHandle,
} from "@/components/ui/stateful-button";
import { cn } from "@/lib/utils";

interface SearchBoxActionsProps {
  buttonRef: React.RefObject<StatefulButtonHandle>;
  disabled: boolean;
  onSearch: () => void | Promise<void>;
  appearance?: "default" | "canvas";
}

const SearchBoxActions: React.FC<SearchBoxActionsProps> = ({
  buttonRef,
  disabled,
  onSearch,
  appearance = "default",
}) => (
  <div className="absolute right-2 top-1/2 z-20 block -translate-y-1/2 transform">
    <StatefulButton
      ref={buttonRef}
      onClick={onSearch}
      disabled={disabled}
      className={cn(
        "h-[44px] min-w-[78px] rounded-[1rem] border border-transparent font-semibold text-white outline-none ring-0 transition-all duration-200 active:scale-95 sm:min-w-[96px]",
        appearance === "canvas"
          ? "bg-[#FF7A59] shadow-[0_8px_18px_rgba(255,122,89,0.24)] hover:-translate-y-0.5 hover:bg-[#F26747] hover:shadow-[0_12px_24px_rgba(255,122,89,0.30)] dark:bg-[#FF967C] dark:text-[#080B12] dark:hover:bg-[#FFA78F]"
          : "bg-gradient-to-r from-blue-600 to-sky-500 shadow-[0_8px_16px_rgba(14,165,233,0.24)] hover:-translate-y-0.5 hover:from-blue-500 hover:to-sky-400 hover:shadow-[0_12px_24px_rgba(14,165,233,0.36)] dark:from-blue-600 dark:to-cyan-600",
      )}
    >
      搜索
    </StatefulButton>
  </div>
);

export default SearchBoxActions;
