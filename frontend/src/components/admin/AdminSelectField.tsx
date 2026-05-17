import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ADMIN_DROPDOWN_CONTENT_CLASSES,
  ADMIN_DROPDOWN_ITEM_CLASSES,
  ADMIN_DROPDOWN_TRIGGER_CLASSES,
} from './adminDropdown';

export interface AdminSelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AdminSelectFieldProps {
  value: string;
  options: readonly AdminSelectFieldOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  disabled?: boolean;
}

/**
 * 统一后台单选下拉框。
 * 采用 Radix Select 作为基础，统一视觉、键盘行为与 portal 渲染层级。
 */
export function AdminSelectField({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  triggerClassName,
  contentClassName,
  itemClassName,
  disabled = false,
}: AdminSelectFieldProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(ADMIN_DROPDOWN_TRIGGER_CLASSES, triggerClassName)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn(ADMIN_DROPDOWN_CONTENT_CLASSES, contentClassName)}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(ADMIN_DROPDOWN_ITEM_CLASSES, itemClassName)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
