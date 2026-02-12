import { Button } from '@/components/ui/button';
import { Clock, X, Trash2, Download, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BatchActionsBar 组件属性
 */
interface BatchActionsBarProps {
    /** 选中的数量 */
    selectedCount: number;
    /** 批量延长回调 */
    onBatchExtend: () => void;
    /** 批量删除回调 */
    onBatchDelete: () => void;
    /** 批量导出回调 */
    onBatchExport: () => void;
    /** 清除选择回调 */
    onClearSelection: () => void;
    /** 是否禁用操作按钮 */
    disabled?: boolean;
}

/**
 * 操作按钮配置类型
 */
interface ActionButtonConfig {
    key: string;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    variant: 'default' | 'blue' | 'red';
    ariaLabel?: string;
}

/**
 * 批量操作工具栏组件
 * 
 * 功能：
 * - 显示选中数量
 * - 批量延长按钮
 * - 批量导出按钮
 * - 批量删除按钮
 * - 清除选择按钮
 */
export function BatchActionsBar({
    selectedCount,
    onBatchExtend,
    onBatchDelete,
    onBatchExport,
    onClearSelection,
    disabled = false,
}: BatchActionsBarProps) {
    // 如果没有选中项，不显示工具栏
    if (selectedCount === 0) {
        return null;
    }

    // 操作按钮配置
    const actionButtons: ActionButtonConfig[] = [
        {
            key: 'extend',
            icon: Clock,
            label: '批量延长有效期',
            onClick: onBatchExtend,
            variant: 'default',
            ariaLabel: `批量延长 ${selectedCount} 个 API Key 的有效期`,
        },
        {
            key: 'export',
            icon: Download,
            label: '批量导出',
            onClick: onBatchExport,
            variant: 'blue',
            ariaLabel: `批量导出 ${selectedCount} 个 API Key`,
        },
        {
            key: 'delete',
            icon: Trash2,
            label: '批量删除',
            onClick: onBatchDelete,
            variant: 'red',
            ariaLabel: `批量删除 ${selectedCount} 个 API Key`,
        },
    ];

    /**
     * 获取按钮样式类名
     */
    const getButtonClassName = (variant: ActionButtonConfig['variant']) => {
        const baseClass = "flex items-center gap-2 h-9";
        const variantClasses = {
            default: "",
            blue: "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20",
            red: "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20",
        };
        return cn(baseClass, variantClasses[variant]);
    };

    return (
        <div className="flex items-center gap-3">
            {/* 左侧：选中数量 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    已选中 {selectedCount} 个
                </span>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
                {actionButtons.map(({ key, icon: Icon, label, onClick, variant, ariaLabel }) => (
                    <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={onClick}
                        className={getButtonClassName(variant)}
                        disabled={disabled}
                        aria-label={ariaLabel}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </Button>
                ))}
                
                {/* 清除选择按钮 */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="flex items-center gap-2 h-9"
                    disabled={disabled}
                    aria-label="清除所有选择"
                >
                    <X className="w-4 h-4" />
                    清除选择
                </Button>
            </div>
        </div>
    );
}
