import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Copy, Edit, Trash2 } from 'lucide-react';
import type { APIKeyInfo } from '@/types/api';

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

    return (
        <TableRow className={expired || !apiKey.is_enabled ? 'opacity-60' : ''}>
            <TableCell>
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
                    <span>{formatKeyDisplay(apiKey.key)}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCopyKey(apiKey.key)}
                        className="h-6 w-6 p-0"
                    >
                        <Copy className="w-3 h-3" />
                    </Button>
                </div>
            </TableCell>
            <TableCell>
                {apiKey.description || <span className="text-gray-400">无</span>}
            </TableCell>
            <TableCell className="text-sm">
                {formatDateTime(apiKey.created_at)}
            </TableCell>
            <TableCell className="text-sm">
                {formatDateTime(apiKey.expires_at)}
            </TableCell>
            <TableCell className="text-sm">
                <span className={expired ? 'text-red-500 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                    {calculateRemainingTime(apiKey.expires_at)}
                </span>
            </TableCell>
            <TableCell>
                <span className={`font-medium ${status.className}`}>
                    {status.text}
                </span>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditClick(apiKey)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                        title="编辑"
                        disabled={isDeleting}
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteClick(apiKey.key)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        title="删除"
                        disabled={isDeleting}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
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
