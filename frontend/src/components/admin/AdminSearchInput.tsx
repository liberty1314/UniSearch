import React from 'react';
import { Search } from 'lucide-react';

interface AdminSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * 统一搜索输入框 — 提取自 Channel/Plugin/Users 视图的重复 search input pattern
 */
export function AdminSearchInput({
  value,
  onChange,
  placeholder = '搜索...',
}: AdminSearchInputProps) {
  return (
    <label className="flex items-center gap-2 rounded-[1.1rem] border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-slate-900/40">
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
    </label>
  );
}
