import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Plus, RefreshCw, Search, ShieldBan, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { AdminDataTable } from '@/components/admin/AdminDataTable';
import type { AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { ApplePagination } from './ApplePagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BanIPDialog } from './BanIPDialog';

import {
  AdminContentCard,
  AdminMetricCard,
  AdminMetricGrid,
} from './AdminWorkspacePageFrame';
import {
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
  ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';

import { BannedIPService } from '@/services/bannedIPService';
import type { BannedIP } from '@/types/bannedIP';
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

const BANNED_IP_TABLE_GRID_GAP_CLASS_NAME = 'gap-x-6';
const BANNED_IP_TABLE_GRID_TEMPLATE_COLUMNS = [
  'minmax(160px,1.1fr)',
  'minmax(180px,1.4fr)',
  '96px',
  'minmax(150px,1fr)',
  'minmax(150px,1fr)',
  '104px',
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

const BannedIPView: React.FC = () => {
  const { isAdmin, logout } = useAuthStore();

  const [items, setItems] = useState<BannedIP[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchInput, setSearchInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');

  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [ipToUnban, setIpToUnban] = useState<BannedIP | null>(null);
  const [isUnbanning, setIsUnbanning] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = activeKeyword.trim().length > 0;
  const autoCount = items.filter((item) => item.source === 'auto').length;
  const manualCount = items.filter((item) => item.source === 'manual').length;

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

  const loadBannedIPs = useCallback(
    async (page?: number) => {
      setIsLoading(true);
      try {
        const targetPage = page || currentPage;
        const response = await BannedIPService.listBannedIPs(
          targetPage,
          pageSize,
          activeKeyword.trim() || undefined,
        );
        setItems(response.items);
        setTotal(response.total);
        setCurrentPage(response.page);
      } catch (error: unknown) {
        handleAdminError('加载封禁列表失败', error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeKeyword, currentPage, handleAdminError, pageSize],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadBannedIPs(currentPage);
    }
  }, [activeKeyword, currentPage, isAdmin, loadBannedIPs, pageSize]);

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

  const handleBanSuccess = () => {
    setIsBanDialogOpen(false);
    setCurrentPage(1);
    void loadBannedIPs(1);
  };

  const handleUnbanConfirm = async () => {
    if (!ipToUnban) {
      return;
    }
    setIsUnbanning(true);
    try {
      await BannedIPService.unbanIP(ipToUnban.id);
      toast.success(`已解封 IP "${ipToUnban.ip}"`);
      setIpToUnban(null);
      void loadBannedIPs();
    } catch (error: unknown) {
      handleAdminError('解封失败', error);
    } finally {
      setIsUnbanning(false);
    }
  };

  const renderSourceBadge = (source: BannedIP['source']) =>
    source === 'auto' ? (
      <Badge variant="warning">自动</Badge>
    ) : (
      <Badge variant="info">手动</Badge>
    );

  const renderExpiresAt = (item: BannedIP) =>
    item.expires_at === null ? (
      <Badge variant="error">永久</Badge>
    ) : (
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {formatDateTime(item.expires_at)}
      </span>
    );

  const columns: AdminDataTableColumn<BannedIP>[] = [
    {
      key: 'ip',
      title: 'IP 地址',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-50">
          {item.ip}
        </span>
      ),
    },
    {
      key: 'reason',
      title: '封禁原因',
      render: (item) => (
        <span className="block truncate text-sm text-slate-700 dark:text-slate-200" title={item.reason}>
          {item.reason || '—'}
        </span>
      ),
    },
    {
      key: 'source',
      title: '来源',
      align: 'center',
      render: (item) => renderSourceBadge(item.source),
    },
    {
      key: 'expires_at',
      title: '到期时间',
      hideOnMobile: true,
      render: (item) => renderExpiresAt(item),
    },
    {
      key: 'created_at',
      title: '封禁时间',
      sortable: true,
      hideOnMobile: true,
      render: (item) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {formatDateTime(item.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIpToUnban(item);
          }}
          disabled={isUnbanning}
          className="border-[0.5px] border-red-200/60 text-red-600 hover:bg-red-50/80 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <Trash2 className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">解封</span>
        </Button>
      ),
    },
  ];

  const renderMobileItem = (item: BannedIP) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-50">
          {item.ip}
        </span>
        {renderSourceBadge(item.source)}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-[1rem] border-[0.5px] border-slate-200/50 bg-white/40 p-2 text-xs text-gray-500 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">封禁时间</span>
          <span>{formatDateTime(item.created_at)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">到期时间</span>
          <span>{item.expires_at === null ? '永久' : formatDateTime(item.expires_at)}</span>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider opacity-70">封禁原因</span>
          <span className="truncate">{item.reason || '—'}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-slate-200/50 pt-1 dark:border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIpToUnban(item);
          }}
          disabled={isUnbanning}
          className="h-8 px-3 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4 mr-1 text-red-600" />
          <span className="text-sm text-red-600 dark:text-red-300">解封</span>
        </Button>
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
        {/* 统计卡 */}
        <motion.div variants={itemVariants}>
          <AdminMetricGrid>
            <AdminMetricCard label="封禁总数" value={total} hint="当前生效的封禁记录" />
            <AdminMetricCard label="本页自动封禁" value={autoCount} hint="系统自动触发的封禁" />
            <AdminMetricCard label="本页手动封禁" value={manualCount} hint="管理员手动添加的封禁" />
            <AdminMetricCard label="当前页码" value={`${currentPage} / ${totalPages}`} hint="列表分页信息" />
          </AdminMetricGrid>
        </motion.div>

        {/* 内容卡 */}
        <motion.div variants={itemVariants}>
          <AdminContentCard padding="md" className={cn(ADMIN_PANEL_SURFACE_HOVER_CLASSES)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5">
              <div className="flex flex-col gap-2 flex-shrink-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
                  <ShieldBan className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
                  IP 封禁
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
                    placeholder="搜索 IP..."
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
                    onClick={() => void loadBannedIPs()}
                    disabled={isLoading}
                    className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-cyan-300/[0.14] dark:text-slate-200')}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => setIsBanDialogOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-4 text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">手动封禁</span>
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* 内容区：加载 / 空 / 列表 */}
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
                  <ShieldBan className="w-12 h-12 text-blue-400/80 dark:text-cyan-600/80" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  {hasFilters ? '无匹配记录' : '暂无封禁记录'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                  {hasFilters ? '尝试调整搜索关键词来找到您需要的封禁记录。' : '当前没有被封禁的 IP，可通过手动封禁添加新记录。'}
                </p>
                {!hasFilters && (
                  <Button onClick={() => setIsBanDialogOpen(true)} className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:from-blue-700 hover:to-cyan-600 transition-all font-medium text-base">
                    <Plus className="w-5 h-5 mr-2" />
                    手动封禁 IP
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <AdminDataTable
                  data={items}
                  columns={columns}
                  rowKey={(item) => item.id}
                  loading={isLoading}
                  emptyText="暂无封禁记录"
                  hoverable
                  showCount={false}
                  renderMobileItem={renderMobileItem}
                  desktopVariant="management-grid"
                  desktopGridGapClassName={BANNED_IP_TABLE_GRID_GAP_CLASS_NAME}
                  desktopGridTemplateColumns={BANNED_IP_TABLE_GRID_TEMPLATE_COLUMNS}
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

      <BanIPDialog
        open={isBanDialogOpen}
        onOpenChange={setIsBanDialogOpen}
        onSuccess={handleBanSuccess}
      />

      <ConfirmDialog
        open={ipToUnban !== null}
        onOpenChange={(open) => !open && setIpToUnban(null)}
        title="确认解封 IP"
        description={ipToUnban ? `您确定要解封 IP "${ipToUnban.ip}" 吗？解封后该 IP 将恢复访问。` : ''}
        confirmText={isUnbanning ? '解封中...' : '确认解封'}
        variant="destructive"
        onConfirm={() => void handleUnbanConfirm()}
        isLoading={isUnbanning}
      />
    </>
  );
};

export default BannedIPView;
