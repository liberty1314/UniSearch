import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { APIKeyInfo } from '@/types/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ModernApiKeyTableProps {
    apiKeys: APIKeyInfo[];
    selectedKeys: Set<string>;
    onSelectKey: (key: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    onCopyKey: (key: string) => void;
    onEditClick: (key: APIKeyInfo) => void;
    onDeleteClick: (key: string) => void;
    isDeleting: boolean;
    isBatchOperating: boolean;
}

/**
 * 现代化 API Key 表格组件
 */
export const ModernApiKeyTable: React.FC<ModernApiKeyTableProps> = ({
    apiKeys,
    selectedKeys,
    onSelectKey,
    onSelectAll,
    onCopyKey,
    onEditClick,
    onDeleteClick,
    isDeleting,
    isBatchOperating,
}) => {
    const isKeyExpired = (expiresAt: string): boolean => {
        return new Date(expiresAt) < new Date();
    };

    const isAllSelected = (): boolean => {
        const validKeys = apiKeys.filter(key => key.is_enabled && !isKeyExpired(key.expires_at));
        return validKeys.length > 0 && validKeys.every(key => selectedKeys.has(key.key));
    };

    const getStatusColor = (key: APIKeyInfo) => {
        if (!key.is_enabled) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        if (isKeyExpired(key.expires_at)) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    };

    const getStatusIcon = (key: APIKeyInfo) => {
        if (!key.is_enabled) return <XCircle className="w-4 h-4" />;
        if (isKeyExpired(key.expires_at)) return <Clock className="w-4 h-4" />;
        return <CheckCircle className="w-4 h-4" />;
    };

    const getStatusText = (key: APIKeyInfo) => {
        if (!key.is_enabled) return '已禁用';
        if (isKeyExpired(key.expires_at)) return '已过期';
        return '正常';
    };

    return (
        <div className="space-y-4">
            {/* 表头 */}
            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <Checkbox
                    checked={isAllSelected()}
                    onCheckedChange={onSelectAll}
                    disabled={isDeleting || isBatchOperating}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    全选 ({selectedKeys.size} 已选)
                </span>
            </div>

            {/* API Key 卡片列表 */}
            <div className="space-y-3">
                {apiKeys.map((key, index) => {
                    const expired = isKeyExpired(key.expires_at);
                    const canSelect = key.is_enabled && !expired;
                    const isSelected = selectedKeys.has(key.key);

                    return (
                        <motion.div
                            key={key.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className={`group relative bg-white dark:bg-gray-800 rounded-xl p-6 border transition-all duration-300 ${isSelected
                                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* 选择框 */}
                                <div className="pt-1">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => onSelectKey(key.key, checked as boolean)}
                                        disabled={!canSelect || isDeleting || isBatchOperating}
                                    />
                                </div>

                                {/* 主要内容 */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    {/* API Key 和状态 */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-lg truncate max-w-md">
                                                    {key.key}
                                                </code>
                                                <button
                                                    onClick={() => onCopyKey(key.key)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title="复制"
                                                >
                                                    <Copy className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </div>
                                            {key.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {key.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* 状态标签 */}
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(key)}`}>
                                            {getStatusIcon(key)}
                                            {getStatusText(key)}
                                        </div>
                                    </div>

                                    {/* 时间信息 */}
                                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>创建于 {formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: zhCN })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>
                                                {expired
                                                    ? `已过期 ${formatDistanceToNow(new Date(key.expires_at), { addSuffix: true, locale: zhCN })}`
                                                    : `${formatDistanceToNow(new Date(key.expires_at), { addSuffix: true, locale: zhCN })}过期`
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditClick(key)}
                                        disabled={isDeleting || isBatchOperating}
                                        className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDeleteClick(key.key)}
                                        disabled={isDeleting || isBatchOperating}
                                        className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
