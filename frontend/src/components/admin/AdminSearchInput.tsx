import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      reserveMessageSpace={false}
      startAdornment={<Search className="h-4 w-4 text-slate-400" />}
      containerClassName="w-full"
      className="h-11 rounded-[1.1rem] border-slate-200/70 bg-white/70 py-0 text-sm shadow-sm dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]"
    />
  );
}
