import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApplePagination } from './ApplePagination';
import type { PluginInfo } from "@/types/plugin";
import { comparePlugins, getEffectivePluginStatus } from './adminListSort';
import {
  UNIFIED_STATUS_FILTER_OPTIONS,
  type UnifiedStatusFilter,
  isPluginMatchesStatusFilter,
} from './previewFilters';
import { usePagedListScrollReset } from '@/hooks/usePagedListScrollReset';

interface PluginPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plugins: PluginInfo[];
}

const PAGE_SIZE = 10;

const getStatusText = (status: PluginInfo['status']): string => {
  if (status === 'active') return '活跃';
  if (status === 'custom') return '自定义';
  if (status === 'inactive') return '不活跃';
  if (status === 'error') return '异常';
  return '未知';
};

const getStatusClassName = (status: PluginInfo['status']): string => {
  if (status === 'active') {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }
  if (status === 'custom') {
    return 'bg-blue-100 text-blue-700 dark:bg-cyan-950/40 dark:text-cyan-300';
  }
  if (status === 'inactive') {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
  if (status === 'error') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export const PluginPreviewDialog: React.FC<PluginPreviewDialogProps> = ({
  isOpen,
  onClose,
  plugins,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnifiedStatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSearchKeyword('');
    setStatusFilter('all');
    setCurrentPage(1);
  }, [isOpen]);

  const filteredPlugins = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return plugins.filter((plugin) => {
      const matchesKeyword =
        !keyword ||
        plugin.name.toLowerCase().includes(keyword) ||
        plugin.description.toLowerCase().includes(keyword);
      const matchesStatus = isPluginMatchesStatusFilter(plugin, statusFilter);

      return matchesKeyword && matchesStatus;
    });
  }, [plugins, searchKeyword, statusFilter]);

  const sortedFilteredPlugins = useMemo(
    () => [...filteredPlugins].sort(comparePlugins),
    [filteredPlugins]
  );

  const totalPages = Math.max(1, Math.ceil(sortedFilteredPlugins.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  usePagedListScrollReset(listContainerRef, currentPage);

  const pagedPlugins = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedFilteredPlugins.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedFilteredPlugins]);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="gap-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-5 dark:border-slate-700 dark:from-slate-800 dark:to-slate-700">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Activity className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
            插件全量查看
          </DialogTitle>
          <DialogDescription className="mt-1">
            只读视图，可搜索、筛选并分页查看所有插件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border-b border-slate-100 px-5 pb-3 pt-4 dark:border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="按插件名称或描述搜索"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {UNIFIED_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? 'default' : 'outline'}
                onClick={() => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                className="cursor-pointer"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-5">
          {pagedPlugins.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>无匹配数据</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagedPlugins.map((plugin, index) => {
                const displayStatus =
                  plugin.status === 'error' ? 'error' : getEffectivePluginStatus(plugin);
                return (
                  <motion.div
                    key={plugin.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/30 lg:grid-cols-[1.3fr_0.6fr_0.8fr_1.6fr]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">{plugin.name}</p>
                    </div>
                    <div>
                      <Badge variant="outline">优先级 {plugin.priority}</Badge>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClassName(displayStatus)}`}>
                        {getStatusText(displayStatus)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                        {plugin.description || '无描述'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          {filteredPlugins.length > 0 && (
            <ApplePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPlugins.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
