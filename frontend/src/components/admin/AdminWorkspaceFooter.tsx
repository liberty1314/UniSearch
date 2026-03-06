import React from 'react';
import { ApplePagination } from './ApplePagination';

interface AdminWorkspaceFooterProps {
  totalCount: number;
  itemLabel: string;
  isReadOnly: boolean;
  selectedCount: number;
  showPagination: boolean;
  currentPage: number;
  totalPages: number;
  filteredItemsCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function AdminWorkspaceFooter({
  totalCount,
  itemLabel,
  isReadOnly,
  selectedCount,
  showPagination,
  currentPage,
  totalPages,
  filteredItemsCount,
  pageSize,
  onPageChange,
}: AdminWorkspaceFooterProps) {
  return (
    <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          共 {totalCount} 个{itemLabel}
          {!isReadOnly ? `，已选 ${selectedCount} 项` : ''}
        </span>
        {showPagination && (
          <ApplePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItemsCount}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
}
