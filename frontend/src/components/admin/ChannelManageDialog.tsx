import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, CheckCircle2, XCircle, Radio, ToggleLeft, ToggleRight, Zap, GripVertical, ArrowUp, ArrowDown, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ConfirmDialog } from './ConfirmDialog';
import type { TGChannel } from '@/types/api';

interface ChannelManageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    token: string;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const ChannelManageDialog: React.FC<ChannelManageDialogProps> = ({
    isOpen,
    onClose,
    onSuccess,
    token,
}) => {
    const [channels, setChannels] = useState<TGChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [testingStatus, setTestingStatus] = useState<Record<string, TestStatus>>({});
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
    const [isBatchTesting, setIsBatchTesting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; channel: TGChannel | null }>({
        open: false,
        channel: null,
    });

    // 获取频道列表
    const fetchChannels = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/channels', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setChannels(data.channels || []);
            } else {
                toast.error('获取频道列表失败');
            }
        } catch {
            toast.error('获取频道列表出错');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isOpen) {
            fetchChannels();
        }
    }, [isOpen, fetchChannels]);

    // 添加频道
    const handleAddChannel = async () => {
        const name = newChannelName.trim();
        if (!name) {
            toast.error('请输入频道名称');
            return;
        }

        setIsAdding(true);
        try {
            const response = await fetch('/api/admin/channels', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });

            if (response.ok) {
                toast.success(`频道 ${name} 添加成功`);
                setNewChannelName('');
                await fetchChannels();
            } else {
                const data = await response.json();
                toast.error(data.error || '添加频道失败');
            }
        } catch {
            toast.error('添加频道出错');
        } finally {
            setIsAdding(false);
        }
    };

    // 删除频道 - 弹出确认框
    const handleDeleteChannel = (channel: TGChannel) => {
        setDeleteConfirm({ open: true, channel });
    };

    // 确认删除
    const confirmDelete = async () => {
        const channel = deleteConfirm.channel;
        if (!channel) return;
        setDeleteConfirm({ open: false, channel: null });

        setDeletingIds(prev => new Set(prev).add(channel.id));
        try {
            const response = await fetch(`/api/admin/channels/${channel.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                toast.success(`频道 ${channel.name} 已删除`);
                await fetchChannels();
            } else {
                const data = await response.json();
                toast.error(data.error || '删除频道失败');
            }
        } catch {
            toast.error('删除频道出错');
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(channel.id);
                return next;
            });
        }
    };

    // 切换频道启用/禁用状态
    const handleToggleEnabled = async (channel: TGChannel) => {
        const newEnabled = !channel.is_enabled;
        try {
            const response = await fetch(`/api/admin/channels/${channel.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_enabled: newEnabled }),
            });

            if (response.ok) {
                toast.success(`频道 ${channel.name} 已${newEnabled ? '启用' : '禁用'}`);
                setChannels(prev =>
                    prev.map(ch =>
                        ch.id === channel.id ? { ...ch, is_enabled: newEnabled } : ch
                    )
                );
            } else {
                const data = await response.json();
                toast.error(data.error || '更新频道失败');
            }
        } catch {
            toast.error('更新频道出错');
        }
    };

    // 测试频道可用性
    const handleTestChannel = async (channelName: string) => {
        setTestingStatus(prev => ({ ...prev, [channelName]: 'testing' }));

        try {
            const response = await fetch(`/api/admin/channels/${channelName}/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.accessible) {
                setTestingStatus(prev => ({ ...prev, [channelName]: 'success' }));
                toast.success(`频道 ${channelName} 可访问`);
            } else {
                setTestingStatus(prev => ({ ...prev, [channelName]: 'error' }));
                toast.error(`频道 ${channelName} 不可访问`, {
                    description: data.error || '频道可能不存在或已被限制',
                });
            }
        } catch {
            setTestingStatus(prev => ({ ...prev, [channelName]: 'error' }));
            toast.error(`测试频道 ${channelName} 出错`);
        }

        // 5秒后重置状态
        setTimeout(() => {
            setTestingStatus(prev => ({ ...prev, [channelName]: 'idle' }));
        }, 5000);
    };

    // 批量测试所有已启用频道
    const handleBatchTest = async () => {
        const enabledChannels = channels.filter(ch => ch.is_enabled);
        if (enabledChannels.length === 0) {
            toast.error('没有已启用的频道可供测试');
            return;
        }

        setIsBatchTesting(true);
        // 设置所有频道为 testing 状态
        const testingMap: Record<string, TestStatus> = {};
        enabledChannels.forEach(ch => { testingMap[ch.name] = 'testing'; });
        setTestingStatus(prev => ({ ...prev, ...testingMap }));

        // 并发测试所有频道
        const results = await Promise.allSettled(
            enabledChannels.map(async (ch) => {
                try {
                    const response = await fetch(`/api/admin/channels/${ch.name}/test`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const data = await response.json();
                    setTestingStatus(prev => ({
                        ...prev,
                        [ch.name]: data.accessible ? 'success' : 'error',
                    }));
                    return { name: ch.name, accessible: data.accessible };
                } catch {
                    setTestingStatus(prev => ({ ...prev, [ch.name]: 'error' }));
                    return { name: ch.name, accessible: false };
                }
            })
        );

        const successCount = results.filter(
            r => r.status === 'fulfilled' && r.value.accessible
        ).length;
        const failCount = enabledChannels.length - successCount;

        if (failCount === 0) {
            toast.success(`全部 ${successCount} 个频道可访问`);
        } else {
            toast.warning(`${successCount} 个可访问，${failCount} 个不可访问`);
        }

        setIsBatchTesting(false);

        // 10秒后重置所有状态
        setTimeout(() => {
            setTestingStatus({});
        }, 10000);
    };

    // 移动频道排序
    const handleMoveChannel = async (channel: TGChannel, direction: 'up' | 'down') => {
        const currentIndex = channels.findIndex(ch => ch.id === channel.id);
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (swapIndex < 0 || swapIndex >= channels.length) return;

        const swapChannel = channels[swapIndex];

        // 交换 sort_order
        try {
            await Promise.all([
                fetch(`/api/admin/channels/${channel.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sort_order: swapChannel.sort_order }),
                }),
                fetch(`/api/admin/channels/${swapChannel.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sort_order: channel.sort_order }),
                }),
            ]);

            await fetchChannels();
        } catch {
            toast.error('调整排序失败');
        }
    };

    // 获取测试状态图标
    const getTestIcon = (status: TestStatus) => {
        switch (status) {
            case 'testing':
                return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
            case 'success':
                return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
            case 'error':
                return <XCircle className="w-3.5 h-3.5 text-red-500" />;
            default:
                return <Zap className="w-3.5 h-3.5" />;
        }
    };

    const handleClose = () => {
        setNewChannelName('');
        onSuccess();
        onClose();
    };

    const enabledCount = channels.filter(ch => ch.is_enabled).length;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* 对话框 */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 头部 */}
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        Telegram 频道管理
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        添加、删除和管理搜索用的 Telegram 频道
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center cursor-pointer"
                                >
                                    <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                </motion.button>
                            </div>

                            {/* 添加频道区域 */}
                            <div className="px-5 pt-4 pb-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="输入频道名称（如 tgsearchers3）"
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value)}
                                        className="flex-1"
                                        disabled={isAdding}
                                    />
                                    <Button
                                        onClick={handleAddChannel}
                                        disabled={isAdding || !newChannelName.trim()}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shrink-0"
                                    >
                                        {isAdding ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                        ) : (
                                            <Plus className="w-4 h-4 mr-1" />
                                        )}
                                        添加
                                    </Button>
                                </div>
                            </div>

                            {/* 频道列表 */}
                            <div className="flex-1 overflow-y-auto px-5 py-2">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    </div>
                                ) : channels.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>暂无频道，请添加搜索频道</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {channels.map((channel, index) => (
                                            <motion.div
                                                key={channel.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${channel.is_enabled
                                                    ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                                    : 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-700/50 opacity-60'
                                                    }`}
                                            >
                                                {/* 左侧：排序把手 + 状态点 + 频道名 */}
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {/* 排序控制 */}
                                                    <div className="flex flex-col gap-0.5">
                                                        <button
                                                            onClick={() => handleMoveChannel(channel, 'up')}
                                                            disabled={index === 0}
                                                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            <ArrowUp className="w-3 h-3 text-slate-500" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveChannel(channel, 'down')}
                                                            disabled={index === channels.length - 1}
                                                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            <ArrowDown className="w-3 h-3 text-slate-500" />
                                                        </button>
                                                    </div>

                                                    <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />

                                                    {/* 状态指示器 */}
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${channel.is_enabled ? 'bg-green-500' : 'bg-gray-400'
                                                        }`} />

                                                    {/* 频道名 */}
                                                    <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                                        {channel.name}
                                                    </span>

                                                    {!channel.is_enabled && (
                                                        <Badge variant="outline" className="text-xs text-slate-400 border-slate-300 dark:border-slate-600 shrink-0">
                                                            已禁用
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* 右侧：操作按钮 */}
                                                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                                    {/* 测试按钮 */}
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleTestChannel(channel.name)}
                                                            disabled={testingStatus[channel.name] === 'testing'}
                                                            className="h-7 px-2 text-xs cursor-pointer"
                                                        >
                                                            {getTestIcon(testingStatus[channel.name] || 'idle')}
                                                            <span className="ml-1 hidden sm:inline">测试</span>
                                                        </Button>
                                                    </motion.div>

                                                    {/* 启用/禁用切换 */}
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleToggleEnabled(channel)}
                                                            className={`h-7 px-2 text-xs cursor-pointer ${channel.is_enabled
                                                                ? 'text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20'
                                                                : 'text-slate-500 border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700/50'
                                                                }`}
                                                        >
                                                            {channel.is_enabled ? (
                                                                <ToggleRight className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <ToggleLeft className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    </motion.div>

                                                    {/* 删除按钮 */}
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteChannel(channel)}
                                                            disabled={deletingIds.has(channel.id)}
                                                            className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 cursor-pointer"
                                                        >
                                                            {deletingIds.has(channel.id) ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </Button>
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 底部 */}
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        共 {channels.length} 个频道，{enabledCount} 个已启用
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleBatchTest}
                                            disabled={isBatchTesting || channels.length === 0}
                                            className="cursor-pointer text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                                        >
                                            {isBatchTesting ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                            ) : (
                                                <PlayCircle className="w-4 h-4 mr-1" />
                                            )}
                                            批量测试
                                        </Button>
                                        <Button variant="outline" onClick={handleClose} className="cursor-pointer">
                                            关闭
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}

            {/* 删除确认弹窗 */}
            <ConfirmDialog
                open={deleteConfirm.open}
                onOpenChange={(open) => !open && setDeleteConfirm({ open: false, channel: null })}
                title="删除频道"
                description={`确定要删除频道 "${deleteConfirm.channel?.name || ''}" 吗？删除后该频道将不再参与搜索。`}
                confirmText="删除"
                variant="destructive"
                onConfirm={confirmDelete}
                isLoading={deleteConfirm.channel ? deletingIds.has(deleteConfirm.channel.id) : false}
            />
        </AnimatePresence>
    );
};
