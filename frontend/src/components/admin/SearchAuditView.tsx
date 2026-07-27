import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { History, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { AdminDataTable } from '@/components/admin/AdminDataTable';
import type { AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { ApplePagination } from './ApplePagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import {
  AdminContentCard,
  AdminMetricCard,
  AdminMetricGrid,
} from './AdminWorkspacePageFrame';
import {
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
  ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';

import { SearchAuditService } from '@/services/searchAuditService';
import type { SearchAuditLog } from '@/types/searchAudit';
import { useAuthStore } from '@/stores/authStore';
import { getErrorDataError, getErrorMessage, getErrorStatus } from '@/lib/error';

const countPillClassName =
  'inline-flex items-center gap-2 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-200';

const CLEANUP_RETENTION_DAYS = 30;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const SEARCH_AUDIT_TABLE_GRID_GAP_CLASS_NAME = 'gap-x-6';
const SEARCH_AUDIT_TABLE_GRID_TEMPLATE_COLUMNS = [
  'minmax(160px,1.1fr)',
  'minmax(140px,0.9fr)',
  'minmax(180px,1.4fr)',
  '96px',
  'minmax(140px,1fr)',
].join(' ');

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '';
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return '未知时间';
  }
  return new Date(timestamp).toLocaleString('zh-CN');
};

const renderScopeBadge = (scope: string) =>
  scope === 'progressive' ? (
    <Badge variant="info">渐进式</Badge>
  ) : (
    <Badge variant="success">普通</Badge>
  );

const SearchAuditView: React.FC = () => {
  const { isAdmin, logout } = useAuthStore();

  const [items, setItems] = useState<SearchAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchInput, setSearchInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');

  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = activeKeyword.trim().length > 0;
  const uniqueUsers = new Set(items.map((item) => item.username)).size;

  const handleAdminError = useCallback(
    (message: string, error: unknown) => {
      console.error(message, error);
      const status = getErrorStatus(error);
      if (status === 401) {
        toast.error('登录已过期，请重新登录');
        logout();
        return;
      }
      if (status === 403) {
        toast.error(getErrorDataError(error) || '权限不足');
        return;
      }
      toast.error(`${message}：${getErrorDataError(error) || getErrorMessage(error)}`);
    },
    [logout],
  );

  const loadAuditLogs = useCallback(
    async (page?: number) => {
      setIsLoading(true);
      try {
        const targetPage = page || currentPage;
        const response = await SearchAuditService.list({
          page: targetPage,
          size: pageSize,
          keyword: activeKeyword.trim() || undefined,
        });
        setItems(response.items);
        setTotal(response.total);
        setCurrentPage(response.page);
      } catch (error: unknown) {
        handleAdminError('加载搜索审计失败', error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeKeyword, currentPage, handleAdminError, pageSize],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadAuditLogs(currentPage);
    }
  }, [activeKeyword, currentPage, isAdmin, loadAuditLogs, pageSize]);

  const handleSearchSubmit = () => {
    setActiveKeyword(searchInput);
    setCurrentPage(1);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (value === '') {
      setActiveKeyword('');
      setCurrentPage(1);
    }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleCleanupConfirm = async () => {
    setIsCleaning(true);
    try {
      const response = await SearchAuditService.cleanup(CLEANUP_RETENTION_DAYS);
      toast.success(`已清理 ${response.deleted} 条 ${CLEANUP_RETENTION_DAYS} 天前的记录`);
      setIsCleanupOpen(false);
      setCurrentPage(1);
      void loadAuditLogs(1);
    } catch (error: unknown) {
      handleAdminError('清理失败', error);
    } finally {
      setIsCleaning(false);
    }
  };

  const columns: AdminDataTableColumn<SearchAuditLog>[] = [
    {
      key: 'created_at',
      title: '搜索时间',
      sortable: true,
      render: (item) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {formatDateTime(item.created_at)}
        </span>
      ),
    },
    {
      key: 'username',
      title: '用户',
      render: (item) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {item.username || `#${item.user_id}`}
        </span>
      ),
    },
    {
      key: 'keyword',
      title: '关键词',
      render: (item) => (
        <span className="block truncate text-sm text-slate-700 dark:text-slate-200" title={item.keyword}>
          {item.keyword || '—'}
        </span>
      ),
    },
    {
      key: 'result_count',
      title: '结果数',
      align: 'center',
      render: (item) => (
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {item.result_count}
        </span>
      ),
    },
    {
      key: 'scope',
      title: '类型',
      align: 'center',
      hideOnMobile: true,
      render: (item) => renderScopeBadge(item.scope),
    },
    {
      key: 'client_ip',
      title: 'IP 地址',
      hideOnMobile: true,
      render: (item) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
          {item.client_ip || '—'}
        </span>
      ),
    },
  ];

  const renderMobileItem = (item: SearchAuditLog) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {item.keyword || '—'}
        </span>
        {renderScopeBadge(item.scope)}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-[1rem] border-[0.5px] border-slate-200/50 bg-white/40 p-2 text-xs text-gray-500 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">用户</span>
          <span>{item.username || `#${item.user_id}`}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">结果数</span>
          <span>{item.result_count}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">搜索时间</span>
          <span>{formatDateTime(item.created_at)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">IP 地址</span>
          <span className="font-mono">{item.client_ip || '—'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <AdminMetricGrid>
            <AdminMetricCard label="审计总数" value={total} hint="累计搜索审计记录" />
            <AdminMetricCard label="本页独立用户" value={uniqueUsers} hint="当前页去重用户数" />
            <AdminMetricCard label="当前页码" value={`${currentPage} / ${totalPages}`} hint="列表分页信息" />
            <AdminMetricCard label="每页条数" value={pageSize} hint="分页大小" />
          </AdminMetricGrid>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AdminContentCard padding="md" className={cn(ADMIN_PANEL_SURFACE_HOVER_CLASSES)}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5">
              <div className="flex flex-col gap-2 flex-shrink-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
                  <History className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
                  搜索审计
                </h2>
                <div className={countPillClassName}>
                  <span className={`inline-block h-2 w-2 rounded-full bg-cyan-500 ${isLoading ? 'animate-pulse' : ''}`} />
                  {isLoading ? '同步中' : `共 ${total} 条记录`}
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
                <div className="relative h-9 w-full sm:w-64 lg:w-80">
                  <Input
                    type="text"
                    placeholder="搜索关键词..."
                    value={searchInput}
                    startAdornment={<Search className="h-4 w-4 text-slate-400" />}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchSubmit();
                      }
                    }}
                    containerClassName="h-9 [&>div:last-child]:hidden"
                    className="h-9 w-full border-[0.5px] border-slate-200/70 bg-white/60 py-0 text-sm leading-9 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52]"
                  />
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadAuditLogs()}
                    disabled={isLoading}
                    className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-cyan-300/[0.14] dark:text-slate-200')}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCleanupOpen(true)}
                    disabled={isLoading || total === 0}
                    className="border-[0.5px] border-red-200/60 text-red-600 hover:bg-red-50/80 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">清理 {CLEANUP_RETENTION_DAYS} 天前</span>
                  </Button>
                </motion.div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-16">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">
                  <RefreshCw className="w-10 h-10 text-blue-600 dark:text-cyan-400" />
                </motion.div>
                <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">同步数据中...</p>
              </div>
            ) : items.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="text-center py-20 flex flex-col items-center justify-center">
                <div className="mb-6 inline-flex rounded-[2rem] border border-slate-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
                  <History className="w-12 h-12 text-blue-400/80 dark:text-cyan-600/80" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  {hasFilters ? '无匹配记录' : '暂无搜索审计记录'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                  {hasFilters ? '尝试调整搜索关键词来找到您需要的审计记录。' : '当用户执行搜索后，审计记录会出现在这里。'}
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <AdminDataTable
                  data={items}
                  columns={columns}
                  rowKey={(item) => item.id}
                  loading={isLoading}
                  emptyText="暂无搜索审计记录"
                  hoverable
                  showCount={false}
                  renderMobileItem={renderMobileItem}
                  desktopVariant="management-grid"
                  desktopGridGapClassName={SEARCH_AUDIT_TABLE_GRID_GAP_CLASS_NAME}
                  desktopGridTemplateColumns={SEARCH_AUDIT_TABLE_GRID_TEMPLATE_COLUMNS}
                  desktopGridMinWidth="960px"
                />

                {total > 0 && (
                  <ApplePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    isLoading={isLoading}
                  />
                )}
              </motion.div>
            )}
          </AdminContentCard>
        </motion.div>
      </motion.div>

      <ConfirmDialog
        open={isCleanupOpen}
        onOpenChange={(open) => !open && setIsCleanupOpen(false)}
        title="确认清理搜索审计"
        description={`您确定要清理 ${CLEANUP_RETENTION_DAYS} 天前的搜索审计记录吗？此操作无法撤销。`}
        confirmText={isCleaning ? '清理中...' : '确认清理'}
        variant="destructive"
        onConfirm={() => void handleCleanupConfirm()}
        isLoading={isCleaning}
      />
    </>
  );
};

export default SearchAuditView;
