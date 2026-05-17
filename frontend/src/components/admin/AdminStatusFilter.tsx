import React from 'react';
import { AdminSelectField, type AdminSelectFieldOption } from './AdminSelectField';

export interface StatusFilterOption {
  value: string;
  label: string;
}

interface AdminStatusFilterProps {
  options: readonly StatusFilterOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

/**
 * 统一状态筛选下拉框。
 */
export function AdminStatusFilter({
  options,
  value,
  onChange,
  ariaLabel = '状态筛选',
}: AdminStatusFilterProps) {
  const selectOptions: AdminSelectFieldOption[] = options.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  return (
    <AdminSelectField
      value={value}
      options={selectOptions}
      onChange={onChange}
      ariaLabel={ariaLabel}
      placeholder="请选择状态"
    />
  );
}
