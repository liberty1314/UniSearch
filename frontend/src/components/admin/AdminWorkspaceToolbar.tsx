import React from 'react';
import { Loader2, PlayCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UNIFIED_STATUS_FILTER_OPTIONS, type UnifiedStatusFilter } from './previewFilters';

interface AdminWorkspaceToolbarProps {
  isReadOnly: boolean;
  isOperationBusy: boolean;
  isBatchTesting: boolean;
  selectedCount: number;
  filteredItemsCount: number;
  isAllFilteredSelected: boolean;
  statusFilter: UnifiedStatusFilter;
  addButtonLabel: string;
  addButtonAriaLabel: string;
  addButtonClassName: string;
  batchTestClassName: string;
  batchTestDisabled: boolean;
  onSetStatusFilter: (value: UnifiedStatusFilter) => void;
  onOpenAddDialog: () => void;
  onBatchToggle: (isEnabled: boolean) => void;
  onOpenBatchDeleteConfirm: () => void;
  onBatchTest: () => void;
  onToggleSelectFiltered: () => void;
}

export function AdminWorkspaceToolbar({
  isReadOnly,
  isOperationBusy,
  isBatchTesting,
  selectedCount,
  filteredItemsCount,
  isAllFilteredSelected,
  statusFilter,
  addButtonLabel,
  addButtonAriaLabel,
  addButtonClassName,
  batchTestClassName,
  batchTestDisabled,
  onSetStatusFilter,
  onOpenAddDialog,
  onBatchToggle,
  onOpenBatchDeleteConfirm,
  onBatchTest,
  onToggleSelectFiltered,
}: AdminWorkspaceToolbarProps) {
  return (
    <div className="space-y-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {UNIFIED_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={statusFilter === value ? 'default' : 'outline'}
              onClick={() => onSetStatusFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        {!isReadOnly && (
          <Button
            onClick={onOpenAddDialog}
            className={addButtonClassName}
            aria-label={addButtonAriaLabel}
            disabled={isOperationBusy}
          >
            <Plus className="mr-1 h-4 w-4" />
            {addButtonLabel}
          </Button>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBatchToggle(true)}
            disabled={isOperationBusy || selectedCount === 0}
            className="border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
          >
            批量启用
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBatchToggle(false)}
            disabled={isOperationBusy || selectedCount === 0}
          >
            批量停用
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenBatchDeleteConfirm}
            disabled={isOperationBusy || selectedCount === 0}
            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            批量删除
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchTest}
            disabled={batchTestDisabled}
            className={batchTestClassName}
          >
            {isBatchTesting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-1 h-4 w-4" />
            )}
            快速测试
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                已选 {selectedCount} 项
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSelectFiltered}
              disabled={isOperationBusy || filteredItemsCount === 0}
              className="h-8 px-3 text-xs"
            >
              {isAllFilteredSelected ? '清空' : '全选'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
