import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApplePagination } from './ApplePagination';
import type { PluginInfo } from '@/types/api';
import { comparePlugins, getEffectivePluginStatus } from './adminListSort';
import {
  UNIFIED_STATUS_FILTER_OPTIONS,
  type UnifiedStatusFilter,
  isPluginMatchesStatusFilter,
} from './previewFilters';

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
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
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

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    container.scrollTop = 0;
  }, [currentPage]);

  const pagedPlugins = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedFilteredPlugins.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedFilteredPlugins]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    插件全量查看
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    只读视图，可搜索、筛选并分页查看所有插件
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center cursor-pointer"
                  aria-label="关闭插件预览"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </motion.button>
              </div>

              <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700/50 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                  <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
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
                        className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.6fr_0.8fr_1.6fr] gap-2 items-center p-3 rounded-lg border bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{plugin.name}</p>
                        </div>
                        <div>
                          <Badge variant="outline">优先级 {plugin.priority}</Badge>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClassName(displayStatus)}`}>
                            {getStatusText(displayStatus)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                            {plugin.description || '无描述'}
                          </p>
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
