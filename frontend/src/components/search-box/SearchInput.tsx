import React from "react";
import { IoCloseOutline } from "react-icons/io5";

interface SearchInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onEscape: () => void;
  onClear: () => void;
  onHistoryNavigate?: (direction: "next" | "previous") => void;
  onHistorySubmit?: () => boolean;
  onHistoryRemove?: () => boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  inputRef,
  value,
  placeholder,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  onEscape,
  onClear,
  onHistoryNavigate,
  onHistorySubmit,
  onHistoryRemove,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const isComposing =
      event.nativeEvent.isComposing || event.keyCode === 229;

    if (event.key === "Enter" && isComposing) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (onHistorySubmit?.()) {
        return;
      }
      onSubmit();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      onHistoryNavigate?.(event.key === "ArrowDown" ? "next" : "previous");
      return;
    }

    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      value.length === 0 &&
      onHistoryRemove?.()
    ) {
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      onEscape();
      inputRef.current?.blur();
    }
  };

  return (
    <>
      <svg
        className="absolute left-6 top-1/2 z-20 h-6 w-6 -translate-y-1/2 text-blue-500 transition-colors duration-300 group-focus-within:text-blue-600 dark:text-cyan-300 dark:group-focus-within:text-cyan-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className="relative z-10 w-full bg-transparent py-4 pl-14 pr-24 text-base text-gray-900 placeholder-slate-400 focus:outline-none sm:py-5 sm:pr-32 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500/80"
      />

      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-[84px] top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-slate-400 transition-all duration-300 hover:scale-110 hover:bg-slate-100 hover:text-slate-600 active:scale-95 sm:right-[120px] dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-slate-200"
          aria-label="清空输入"
        >
          <IoCloseOutline className="h-5 w-5" />
        </button>
      ) : null}
    </>
  );
};

export default SearchInput;
