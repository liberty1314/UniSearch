import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Loader2, Search, CheckCircle2, Circle, AlertCircle, ShieldCheck } from 'lucide-react';
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
import type { TGChannel } from "@/types/channel";
import { toast } from 'sonner';
import { compareChannels } from './adminListSort';
import {
  UNIFIED_STATUS_FILTER_OPTIONS,
  type UnifiedStatusFilter,
  isChannelMatchesStatusFilter,
} from './previewFilters';
import { usePagedListScrollReset } from '@/hooks/usePagedListScrollReset';

interface ChannelPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

const PAGE_SIZE = 10;

export const ChannelPreviewDialog: React.FC<ChannelPreviewDialogProps> = ({
  isOpen,
  onClose,
  token,
}) => {
  const [channels, setChannels] = useState<TGChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnifiedStatusFilter>('all');
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
    setCurrentPage(1);
    fetchChannels();
  }, [fetchChannels, isOpen]);

  const filteredChannels = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return channels.filter((channel) => {
      const matchesKeyword = !keyword || channel.name.toLowerCase().includes(keyword);
      const matchesStatus = isChannelMatchesStatusFilter(channel, statusFilter);

      return matchesKeyword && matchesStatus;
    });
  }, [channels, searchKeyword, statusFilter]);

  const sortedFilteredChannels = useMemo(
    () => [...filteredChannels].sort(compareChannels),
    [filteredChannels]
  );

  const totalPages = Math.max(1, Math.ceil(sortedFilteredChannels.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  usePagedListScrollReset(listContainerRef, currentPage);

  const pagedChannels = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedFilteredChannels.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedFilteredChannels]);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="gap-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-5 dark:border-slate-700 dark:from-slate-800 dark:to-slate-700">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Radio className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
            TG 频道全量查看
          </DialogTitle>
          <DialogDescription className="mt-1">
            只读视图，可搜索、筛选并分页查看所有频道
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
              placeholder="按频道名称搜索"
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
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : pagedChannels.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
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
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {channel.is_enabled ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="truncate font-mono text-sm font-medium text-slate-700 dark:text-slate-200">
                      {channel.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={channel.is_enabled ? 'success' : 'outline'}>
                      {channel.is_enabled ? '启用' : '禁用'}
                    </Badge>
                    {(channel.health_status || 'untested') === 'healthy' && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        正常
                      </Badge>
                    )}
                    {(channel.health_status || 'untested') === 'error' && (
                      <Badge
                        className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        title={channel.last_error || '最近一次测试失败'}
                      >
                        <AlertCircle className="mr-1 h-3 w-3" />
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

        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          {!isLoading && filteredChannels.length > 0 && (
            <ApplePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredChannels.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
