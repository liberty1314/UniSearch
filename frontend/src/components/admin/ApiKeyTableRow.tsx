import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Edit, Trash2, Check } from 'lucide-react';
import type { APIKeyInfo } from '@/types/api';
import { toast } from 'sonner';

interface ApiKeyTableRowProps {
    apiKey: APIKeyInfo;
    isSelected: boolean;
    canSelect: boolean;
    isDeleting: boolean;
    isBatchOperating: boolean;
    onSelectChange: (key: string, checked: boolean) => void;
    onCopyKey: (key: string) => void;
    onEditClick: (key: APIKeyInfo) => void;
    onDeleteClick: (key: string) => void;
}

/**
 * API Key 表格行组件（已优化）
 * 使用 React.memo 避免不必要的重新渲染
 */
const ApiKeyTableRow: React.FC<ApiKeyTableRowProps> = memo(({
    apiKey,
    isSelected,
    canSelect,
    isDeleting,
    isBatchOperating,
    onSelectChange,
    onCopyKey,
    onEditClick,
    onDeleteClick,
}) => {
    /**
     * 格式化日期时间
     */
    const formatDateTime = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * 计算剩余时间
     */
    const calculateRemainingTime = (expiresAt: string): string => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffMs = expiry.getTime() - now.getTime();

        // 已过期
        if (diffMs < 0) {
            return '已过期';
        }

        // 计算天数、小时数
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (diffDays > 0) {
            return `还剩 ${diffDays} 天`;
        } else if (diffHours > 0) {
            return `还剩 ${diffHours} 小时`;
        } else {
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `还剩 ${diffMinutes} 分钟`;
        }
    };

    /**
     * 格式化 API Key 显示（显示前后部分，中间省略）
     */
    const formatKeyDisplay = (key: string): string => {
        if (key.length <= 20) return key;
        return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
    };

    /**
     * 判断 Key 是否已过期
     */
    const isKeyExpired = (expiresAt: string): boolean => {
        return new Date(expiresAt) < new Date();
    };

    /**
     * 获取状态显示文本和样式
     */
    const getStatusDisplay = (key: APIKeyInfo) => {
        if (!key.is_enabled) {
            return { text: '已禁用', className: 'text-gray-500' };
        }
        if (isKeyExpired(key.expires_at)) {
            return { text: '已过期', className: 'text-red-500' };
        }
        return { text: '正常', className: 'text-green-500' };
    };

    const status = getStatusDisplay(apiKey);
    const expired = isKeyExpired(apiKey.expires_at);
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        await onCopyKey(apiKey.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <TableRow
            className={`
                group transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50
                ${expired || !apiKey.is_enabled ? 'opacity-60' : ''}
            `}
        >
            <TableCell className="w-12">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                        onSelectChange(apiKey.key, checked as boolean)
                    }
                    disabled={!canSelect || isBatchOperating || isDeleting}
                    aria-label={`选择 ${apiKey.key}`}
                />
            </TableCell>
            <TableCell className="font-mono text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                        {formatKeyDisplay(apiKey.key)}
                    </span>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopy}
                        className={`
                            p-1.5 rounded-lg transition-all duration-200
                            ${copied
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }
                        `}
                        title={copied ? '已复制' : '复制'}
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </motion.button>
                </div>
            </TableCell>
            <TableCell className="max-w-xs">
                <span className="text-slate-600 dark:text-slate-400 truncate block">
                    {apiKey.description || <span className="text-slate-400 dark:text-slate-500 italic">无描述</span>}
                </span>
            </TableCell>
            <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(apiKey.created_at)}
            </TableCell>
            <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(apiKey.expires_at)}
            </TableCell>
            <TableCell className="text-sm">
                <span className={expired ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                    {calculateRemainingTime(apiKey.expires_at)}
                </span>
            </TableCell>
            <TableCell>
                <Badge
                    variant={
                        !apiKey.is_enabled ? 'outline' :
                            expired ? 'error' :
                                'success'
                    }
                    className="font-medium"
                >
                    {status.text}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditClick(apiKey)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            title="编辑"
                            disabled={isDeleting}
                        >
                            <Edit className="w-4 h-4" />
                        </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteClick(apiKey.key)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                            title="删除"
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </motion.div>
                </div>
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数，只在这些属性变化时才重新渲染
    return (
        prevProps.apiKey.key === nextProps.apiKey.key &&
        prevProps.apiKey.expires_at === nextProps.apiKey.expires_at &&
        prevProps.apiKey.is_enabled === nextProps.apiKey.is_enabled &&
        prevProps.apiKey.description === nextProps.apiKey.description &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.canSelect === nextProps.canSelect &&
        prevProps.isDeleting === nextProps.isDeleting &&
        prevProps.isBatchOperating === nextProps.isBatchOperating
    );
});

ApiKeyTableRow.displayName = 'ApiKeyTableRow';

export default ApiKeyTableRow;
