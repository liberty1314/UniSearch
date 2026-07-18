import React from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onInputCommitted?: (value: string) => void;
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
  onInputCommitted,
  onSubmit,
  onFocus,
  onBlur,
  onEscape,
  onClear,
  onHistoryNavigate,
  onHistorySubmit,
  onHistoryRemove,
}) => {
  const composingRef = React.useRef(false);
  const skipCommittedChangeRef = React.useRef<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    onChange(nextValue);

    if (composingRef.current) {
      return;
    }

    if (skipCommittedChangeRef.current === nextValue) {
      skipCommittedChangeRef.current = null;
      return;
    }

    skipCommittedChangeRef.current = null;
    onInputCommitted?.(nextValue);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
    skipCommittedChangeRef.current = null;
  };

  const handleCompositionEnd = (
    event: React.CompositionEvent<HTMLInputElement>,
  ) => {
    composingRef.current = false;
    skipCommittedChangeRef.current = event.currentTarget.value;
    onInputCommitted?.(event.currentTarget.value);
  };

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
      <Search
        aria-hidden="true"
        className="absolute left-6 top-1/2 z-20 h-6 w-6 -translate-y-1/2 text-blue-500 transition-colors duration-300 group-focus-within:text-blue-600 dark:text-cyan-300 dark:group-focus-within:text-cyan-200"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
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
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </>
  );
};

export default SearchInput;
