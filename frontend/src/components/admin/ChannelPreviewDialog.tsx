import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, Loader2, Search, CheckCircle2, Circle, Settings2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApplePagination } from './ApplePagination';
import type { TGChannel } from '@/types/api';
import { toast } from 'sonner';

interface ChannelPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenManage: () => void;
  token: string;
}

type ChannelFilter = 'all' | 'enabled' | 'disabled';
type ChannelHealthFilter = 'all' | 'healthy' | 'error' | 'untested';

const PAGE_SIZE = 10;

export const ChannelPreviewDialog: React.FC<ChannelPreviewDialogProps> = ({
  isOpen,
  onClose,
  onOpenManage,
  token,
}) => {
  const [channels, setChannels] = useState<TGChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChannelFilter>('all');
  const [healthFilter, setHealthFilter] = useState<ChannelHealthFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const fetchChannels = useCallback(async () => {
    if (!token) {
      setChannels([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/channels', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取频道列表失败');
      }

      const data = await response.json();
      setChannels(Array.isArray(data?.channels) ? data.channels : []);
    } catch (error) {
      console.error('获取频道列表失败:', error);
      toast.error('获取频道列表失败');
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;

    setSearchKeyword('');
    setStatusFilter('all');
    setHealthFilter('all');
    setCurrentPage(1);
    fetchChannels();
  }, [fetchChannels, isOpen]);

  const filteredChannels = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return channels.filter((channel) => {
      const matchesKeyword = !keyword || channel.name.toLowerCase().includes(keyword);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && channel.is_enabled) ||
        (statusFilter === 'disabled' && !channel.is_enabled);
      const channelHealth = channel.health_status || 'untested';
      const matchesHealth =
        healthFilter === 'all' ||
        (healthFilter === 'healthy' && channelHealth === 'healthy') ||
        (healthFilter === 'error' && channelHealth === 'error') ||
        (healthFilter === 'untested' && channelHealth === 'untested');

      return matchesKeyword && matchesStatus && matchesHealth;
    });
  }, [channels, searchKeyword, statusFilter, healthFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredChannels.length / PAGE_SIZE));

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

  const pagedChannels = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredChannels.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredChannels]);

  const totalCount = channels.length;
  const enabledCount = channels.filter((channel) => channel.is_enabled).length;
  const disabledCount = totalCount - enabledCount;
  const errorCount = channels.filter((channel) => (channel.health_status || 'untested') === 'error').length;
  const untestedCount = channels.filter((channel) => !channel.health_status || channel.health_status === 'untested').length;

  const handleOpenManage = () => {
    onClose();
    onOpenManage();
  };

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
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    TG 频道全量查看
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    只读视图，可搜索、筛选并分页查看所有频道
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center cursor-pointer"
                  aria-label="关闭频道预览"
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
                    placeholder="按频道名称搜索"
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => {
                      setStatusFilter('all');
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    全部
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'enabled' ? 'default' : 'outline'}
                    onClick={() => {
                      setStatusFilter('enabled');
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    启用
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'disabled' ? 'default' : 'outline'}
                    onClick={() => {
                      setStatusFilter('disabled');
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    禁用
                  </Button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                  <Button
                    size="sm"
                    variant={healthFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => {
                      setHealthFilter('all');
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    健康全部
                  </Button>
                  <Button
                    size="sm"
                    variant={healthFilter === 'healthy' ? 'default' : 'outline'}
                    onClick={() => {
                      setHealthFilter('healthy');
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    正常
                  </Button>
                  <Button
                    size="sm"
                    variant={healthFilter === 'error' ? 'default' : 'outline'}
                    onClick={() => {
                      setHealthFilter('error');
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    异常
                  </Button>
                  <Button
                    size="sm"
                    variant={healthFilter === 'untested' ? 'default' : 'outline'}
                    onClick={() => {
                      setHealthFilter('untested');
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                  >
                    未测试
                  </Button>
                </div>
              </div>

              <div ref={listContainerRef} className="flex-1 overflow-y-auto p-5">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : pagedChannels.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>无匹配数据</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagedChannels.map((channel, index) => (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {channel.is_enabled ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {channel.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={channel.is_enabled ? 'success' : 'outline'}>
                            {channel.is_enabled ? '启用' : '禁用'}
                          </Badge>
                          {(channel.health_status || 'untested') === 'healthy' && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              正常
                            </Badge>
                          )}
                          {(channel.health_status || 'untested') === 'error' && (
                            <Badge
                              className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              title={channel.last_error || '最近一次测试失败'}
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              异常
                            </Badge>
                          )}
                          {(channel.health_status || 'untested') === 'untested' && (
                            <Badge variant="outline">未测试</Badge>
                          )}
                          <Badge variant="outline">排序 {channel.sort_order}</Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-sm">
                  <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    总频道 <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    已启用 <span className="font-semibold text-emerald-600 dark:text-emerald-400">{enabledCount}</span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    已禁用 <span className="font-semibold text-slate-700 dark:text-slate-300">{disabledCount}</span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-red-200 dark:border-red-800 px-3 py-2">
                    异常 <span className="font-semibold text-red-600 dark:text-red-400">{errorCount}</span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2">
                    未测试 <span className="font-semibold text-slate-700 dark:text-slate-300">{untestedCount}</span>
                  </div>
                </div>

                {!isLoading && filteredChannels.length > 0 && (
                  <ApplePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredChannels.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                  />
                )}

                <div className="flex justify-end items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleOpenManage}
                    className="cursor-pointer text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                  >
                    <Settings2 className="w-4 h-4 mr-1" />
                    进入编辑模式
                  </Button>
                  <Button variant="outline" onClick={onClose} className="cursor-pointer">
                    关闭
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
