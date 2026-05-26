import React from "react";
import {
  Button as StatefulButton,
  StatefulButtonHandle,
} from "@/components/ui/stateful-button";

interface SearchBoxActionsProps {
  buttonRef: React.RefObject<StatefulButtonHandle>;
  disabled: boolean;
  onSearch: () => void;
}

const SearchBoxActions: React.FC<SearchBoxActionsProps> = ({
  buttonRef,
  disabled,
  onSearch,
}) => (
  <div className="absolute right-2 top-1/2 z-20 block -translate-y-1/2 transform">
    <StatefulButton
      ref={buttonRef}
      onClick={onSearch}
      disabled={disabled}
      className="h-[44px] min-w-[96px] rounded-[1.5rem] border border-transparent bg-gradient-to-r from-blue-600 to-sky-500 font-semibold text-white shadow-[0_8px_16px_rgba(14,165,233,0.24)] outline-none ring-0 transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-500 hover:to-sky-400 hover:shadow-[0_12px_24px_rgba(14,165,233,0.36)] focus:outline-none active:scale-95 dark:from-blue-600 dark:to-cyan-600 dark:shadow-[0_8px_16px_rgba(8,145,178,0.2)] dark:hover:from-blue-500 dark:hover:to-cyan-500 dark:hover:shadow-[0_12px_24px_rgba(8,145,178,0.36)]"
    >
      搜索
    </StatefulButton>
  </div>
);

export default SearchBoxActions;
