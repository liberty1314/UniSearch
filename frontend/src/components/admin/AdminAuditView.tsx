import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { FileClock, RefreshCw, Search, Trash2 } from 'lucide-react';
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

import { AdminAuditService } from '@/services/adminAuditService';
import type { AdminAuditLog } from '@/types/adminAudit';
import { useAuthStore } from '@/stores/authStore';
import { getErrorDataError, getErrorMessage, getErrorStatus } from '@/lib/error';

const countPillClassName =
  'inline-flex items-center gap-2 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-200';

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

const ADMIN_AUDIT_TABLE_GRID_GAP_CLASS_NAME = 'gap-x-6';
const ADMIN_AUDIT_TABLE_GRID_TEMPLATE_COLUMNS = [
  'minmax(150px,1fr)',
  'minmax(120px,0.9fr)',
  'minmax(140px,1fr)',
  'minmax(160px,1.3fr)',
  '96px',
  'minmax(150px,1fr)',
].join(' ');

const CLEANUP_DAYS = 90;

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

const renderMethodBadge = (method: string) => {
  switch (method) {
    case 'DELETE':
      return <Badge variant="error">{method}</Badge>;
    case 'POST':
      return <Badge variant="info">{method}</Badge>;
    case 'PUT':
    case 'PATCH':
      return <Badge variant="warning">{method}</Badge>;
    default:
      return <Badge variant="secondary">{method || '—'}</Badge>;
  }
};

const AdminAuditView: React.FC = () => {
  const { isAdmin, logout } = useAuthStore();

  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [operatorInput, setOperatorInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [activeOperator, setActiveOperator] = useState('');
  const [activeAction, setActiveAction] = useState('');

  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = activeOperator.trim().length > 0 || activeAction.trim().length > 0;
  const writeCount = items.filter((item) => item.method !== 'GET').length;

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

  const loadLogs = useCallback(
    async (page?: number) => {
      setIsLoading(true);
      try {
        const targetPage = page || currentPage;
        const response = await AdminAuditService.list({
          page: targetPage,
          size: pageSize,
          operator: activeOperator.trim() || undefined,
          action: activeAction.trim() || undefined,
        });
        setItems(response.items);
        setTotal(response.total);
        setCurrentPage(response.page);
      } catch (error: unknown) {
        handleAdminError('加载操作审计失败', error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeAction, activeOperator, currentPage, handleAdminError, pageSize],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadLogs(currentPage);
    }
  }, [activeAction, activeOperator, currentPage, isAdmin, loadLogs, pageSize]);

  const handleSearchSubmit = () => {
    setActiveOperator(operatorInput);
    setActiveAction(actionInput);
    setCurrentPage(1);
  };

  const handleOperatorChange = (value: string) => {
    setOperatorInput(value);
    if (value === '' && actionInput === '') {
      setActiveOperator('');
      setActiveAction('');
      setCurrentPage(1);
    }
  };

  const handleActionChange = (value: string) => {
    setActionInput(value);
    if (value === '' && operatorInput === '') {
      setActiveOperator('');
      setActiveAction('');
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
      const response = await AdminAuditService.cleanup(CLEANUP_DAYS);
      toast.success(`已清理 ${response.deleted} 条 ${CLEANUP_DAYS} 天前的记录`);
      setIsCleanupOpen(false);
      setCurrentPage(1);
      void loadLogs(1);
    } catch (error: unknown) {
      handleAdminError('清理失败', error);
    } finally {
      setIsCleaning(false);
    }
  };

  const columns: AdminDataTableColumn<AdminAuditLog>[] = [
    {
      key: 'created_at',
      title: '操作时间',
      sortable: true,
      render: (item) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {formatDateTime(item.created_at)}
        </span>
      ),
    },
    {
      key: 'operator',
      title: '操作人',
      render: (item) => (
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {item.operator || '—'}
        </span>
      ),
    },
    {
      key: 'action',
      title: '操作',
      render: (item) => (
        <span className="block truncate text-sm text-slate-700 dark:text-slate-200" title={item.action}>
          {item.action || '—'}
        </span>
      ),
    },
    {
      key: 'target',
      title: '目标',
      hideOnMobile: true,
      render: (item) => (
        <span className="block truncate text-sm text-slate-700 dark:text-slate-200" title={item.target}>
          {item.target || '—'}
        </span>
      ),
    },
    {
      key: 'method',
      title: '方法',
      align: 'center',
      render: (item) => renderMethodBadge(item.method),
    },
    {
      key: 'path',
      title: '路径',
      hideOnMobile: true,
      render: (item) => (
        <span className="block truncate font-mono text-xs text-slate-600 dark:text-slate-300" title={item.path}>
          {item.path || '—'}
        </span>
      ),
    },
  ];

  const renderMobileItem = (item: AdminAuditLog) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {item.operator || '—'}
        </span>
        {renderMethodBadge(item.method)}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-[1rem] border-[0.5px] border-slate-200/50 bg-white/40 p-2 text-xs text-gray-500 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">操作</span>
          <span className="truncate">{item.action || '—'}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">操作时间</span>
          <span>{formatDateTime(item.created_at)}</span>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">目标</span>
          <span className="truncate">{item.target || '—'}</span>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">路径</span>
          <span className="truncate font-mono">{item.path || '—'}</span>
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
            <AdminMetricCard label="记录总数" value={total} hint="符合条件的操作审计记录" />
            <AdminMetricCard label="本页写操作" value={writeCount} hint="POST/PUT/DELETE/PATCH" />
            <AdminMetricCard label="当前页码" value={`${currentPage} / ${totalPages}`} hint="列表分页信息" />
            <AdminMetricCard label="留存天数" value={CLEANUP_DAYS} hint="默认审计留存周期" />
          </AdminMetricGrid>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AdminContentCard padding="md" className={cn(ADMIN_PANEL_SURFACE_HOVER_CLASSES)}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5">
              <div className="flex flex-col gap-2 flex-shrink-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
                  <FileClock className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
                  操作审计
                </h2>
                <div className={countPillClassName}>
                  <span className={`inline-block h-2 w-2 rounded-full bg-cyan-500 ${isLoading ? 'animate-pulse' : ''}`} />
                  {isLoading ? '同步中' : `共 ${total} 条记录`}
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
                <div className="relative h-9 w-full sm:w-44">
                  <Input
                    type="text"
                    placeholder="操作人..."
                    value={operatorInput}
                    startAdornment={<Search className="h-4 w-4 text-slate-400" />}
                    onChange={(e) => handleOperatorChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchSubmit();
                      }
                    }}
                    containerClassName="h-9 [&>div:last-child]:hidden"
                    className="h-9 w-full border-[0.5px] border-slate-200/70 bg-white/60 py-0 text-sm leading-9 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52]"
                  />
                </div>

                <div className="relative h-9 w-full sm:w-44">
                  <Input
                    type="text"
                    placeholder="操作类型..."
                    value={actionInput}
                    startAdornment={<Search className="h-4 w-4 text-slate-400" />}
                    onChange={(e) => handleActionChange(e.target.value)}
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
                    onClick={() => void loadLogs()}
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
                    disabled={isLoading}
                    className="border-[0.5px] border-red-200/60 text-red-600 hover:bg-red-50/80 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">清理旧记录</span>
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
                  <FileClock className="w-12 h-12 text-blue-400/80 dark:text-cyan-600/80" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  {hasFilters ? '无匹配记录' : '暂无操作审计记录'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                  {hasFilters ? '尝试调整筛选条件来找到您需要的操作记录。' : '管理员的写操作会自动记录在这里。'}
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <AdminDataTable
                  data={items}
                  columns={columns}
                  rowKey={(item) => item.id}
                  loading={isLoading}
                  emptyText="暂无操作审计记录"
                  hoverable
                  showCount={false}
                  renderMobileItem={renderMobileItem}
                  desktopVariant="management-grid"
                  desktopGridGapClassName={ADMIN_AUDIT_TABLE_GRID_GAP_CLASS_NAME}
                  desktopGridTemplateColumns={ADMIN_AUDIT_TABLE_GRID_TEMPLATE_COLUMNS}
                  desktopGridMinWidth="1040px"
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
        title="清理操作审计记录"
        description={`确定要删除 ${CLEANUP_DAYS} 天前的操作审计记录吗？此操作无法撤销。`}
        confirmText={isCleaning ? '清理中...' : '确认清理'}
        variant="destructive"
        onConfirm={() => void handleCleanupConfirm()}
        isLoading={isCleaning}
      />
    </>
  );
};

export default AdminAuditView;
