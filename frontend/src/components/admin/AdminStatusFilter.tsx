import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StatusFilterOption {
  value: string;
  label: string;
}

interface AdminStatusFilterProps {
  options: readonly StatusFilterOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * 统一状态筛选按钮 — 提取自 Channel/Plugin 视图的重复 pattern
 */
export function AdminStatusFilter({ options, value, onChange }: AdminStatusFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'default' : 'outline'}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full',
            value === option.value && 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white',
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
