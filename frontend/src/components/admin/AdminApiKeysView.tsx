import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle2, Filter, Key, Plus, RefreshCw, Search, X } from 'lucide-react';
import type { APIKeyInfo } from '@/types/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BatchActionsBar } from './BatchActionsBar';
import { StatsCard } from './StatsCard';
import { TableFilterDropdown } from './TableFilterDropdown';
import { AppleApiKeyTable } from './AppleApiKeyTable';
import { ApplePagination } from './ApplePagination';

export interface AdminApiKeysViewModel {
  totalApiKeys: number;
  pagedApiKeys: APIKeyInfo[];
  isLoadingKeys: boolean;
  isDeleting: boolean;
  isBatchOperating: boolean;
  apiKeyCurrentPage: number;
  apiKeyPageSize: number;
  apiKeyTotalPages: number;
  selectedKeys: Set<string>;
  apiKeySearchInput: string;
  statusFilter: string;
  availableStatusOptions: Array<{ label: string; value: string; color: string }>;
  hasAnyFilter: () => boolean;
  isKeyExpired: (expiresAt: string) => boolean;
  onApiKeySearchInputChange: (value: string) => void;
  onApiKeySearchSubmit: () => void;
  onStatusFilterChange: (values: string[]) => void;
  onClearAllFilters: () => void;
  onRefresh: () => void;
  onOpenBatchCreate: () => void;
  onOpenCreateKey: () => void;
  onBatchExtend: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
  onClearSelection: () => void;
  onSelectKey: (key: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onCopyKey: (key: string) => void;
  onEditClick: (key: APIKeyInfo) => void;
  onDeleteClick: (key: string) => void;
  onToggleStatus: (key: APIKeyInfo, isEnabled: boolean) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface AdminApiKeysViewProps {
  viewModel: AdminApiKeysViewModel;
}

const AdminApiKeysView: React.FC<AdminApiKeysViewProps> = ({ viewModel }) => {
  const {
    totalApiKeys,
    pagedApiKeys,
    isLoadingKeys,
    isDeleting,
    isBatchOperating,
    apiKeyCurrentPage,
    apiKeyPageSize,
    apiKeyTotalPages,
    selectedKeys,
    apiKeySearchInput,
    statusFilter,
    availableStatusOptions,
    hasAnyFilter,
    isKeyExpired,
    onApiKeySearchInputChange,
    onApiKeySearchSubmit,
    onStatusFilterChange,
    onClearAllFilters,
    onRefresh,
    onOpenBatchCreate,
    onOpenCreateKey,
    onBatchExtend,
    onBatchDelete,
    onBatchExport,
    onClearSelection,
    onSelectKey,
    onSelectAll,
    onCopyKey,
    onEditClick,
    onDeleteClick,
    onToggleStatus,
    onPageChange,
    onPageSizeChange,
  } = viewModel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="总密钥数" value={totalApiKeys} icon={Key} color="nebula" index={0} />
        <StatsCard
          title="活跃密钥"
          value={pagedApiKeys.filter((k) => !k.is_permanent && k.is_enabled && !isKeyExpired(k.expires_at)).length}
          icon={CheckCircle2}
          color="emerald"
          index={1}
        />
        <StatsCard
          title="即将过期"
          value={pagedApiKeys.filter((k) => {
            if (k.is_permanent) return false;
            const daysLeft = Math.floor((new Date(k.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysLeft >= 0 && daysLeft <= 7;
          }).length}
          icon={AlertCircle}
          color="amber"
          index={2}
        />
        <StatsCard
          title="已过期"
          value={pagedApiKeys.filter((k) => !k.is_permanent && isKeyExpired(k.expires_at)).length}
          icon={Activity}
          color="purple"
          index={3}
        />
      </div>

      <Card className="border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50 min-h-[88px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                API Key 管理
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                {hasAnyFilter() ? (
                  <span className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-700 dark:text-blue-300 font-medium">已应用筛选条件</span>
                    <span className="text-slate-500 dark:text-slate-400">· 共 {totalApiKeys} 条记录</span>
                  </span>
                ) : (
                  '管理系统的 API Keys，控制用户访问权限'
                )}
              </CardDescription>
            </div>

            <AnimatePresence mode="wait">
              {selectedKeys.size > 0 ? (
                <motion.div
                  key="batch-actions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <BatchActionsBar
                    selectedCount={selectedKeys.size}
                    onBatchExtend={onBatchExtend}
                    onBatchDelete={onBatchDelete}
                    onBatchExport={onBatchExport}
                    onClearSelection={onClearSelection}
                    disabled={isLoadingKeys || isBatchOperating || isDeleting}
                  />
                </motion.div>
              ) : hasAnyFilter() ? (
                <motion.div
                  key="filter-actions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-wrap items-center gap-2 sm:gap-3"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">已应用筛选条件</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">· 共 {totalApiKeys} 条</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClearAllFilters} className="flex items-center gap-2 h-9">
                    <X className="w-4 h-4" />
                    清除筛选
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="normal-actions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="搜索 API Key..."
                      value={apiKeySearchInput}
                      onChange={(e) => onApiKeySearchInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onApiKeySearchSubmit();
                        }
                      }}
                      className="pl-9 w-full sm:w-48 h-9 text-sm border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <TableFilterDropdown
                    options={availableStatusOptions}
                    selectedValues={statusFilter ? [statusFilter] : []}
                    onSelectionChange={onStatusFilterChange}
                    multiSelect={false}
                    icon={<Filter className="w-3.5 h-3.5" />}
                  />

                  {hasAnyFilter() && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearAllFilters}
                        className="border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        清除筛选
                      </Button>
                    </motion.div>
                  )}
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      disabled={isLoadingKeys || isBatchOperating}
                      className="border-slate-200 dark:border-slate-700"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      onClick={onOpenBatchCreate}
                      className="flex items-center gap-2 border-slate-200 dark:border-slate-700"
                      disabled={isLoadingKeys || isBatchOperating}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">批量生成</span>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onOpenCreateKey}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
                      disabled={isLoadingKeys || isBatchOperating}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">生成新 Key</span>
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingKeys ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </motion.div>
              <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
            </div>
          ) : pagedApiKeys.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <Key className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">暂无 API Keys</p>
              <Button onClick={onOpenCreateKey} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个 Key
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AppleApiKeyTable
                apiKeys={pagedApiKeys}
                selectedKeys={selectedKeys}
                onSelectKey={onSelectKey}
                onSelectAll={onSelectAll}
                onCopyKey={onCopyKey}
                onEditClick={onEditClick}
                onDeleteClick={onDeleteClick}
                onToggleStatus={onToggleStatus}
                isDeleting={isDeleting}
                isBatchOperating={isBatchOperating}
                isLoading={isLoadingKeys}
              />

              {totalApiKeys > 0 && (
                <ApplePagination
                  currentPage={apiKeyCurrentPage}
                  totalPages={apiKeyTotalPages}
                  totalItems={totalApiKeys}
                  pageSize={apiKeyPageSize}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                  isLoading={isLoadingKeys}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminApiKeysView;
