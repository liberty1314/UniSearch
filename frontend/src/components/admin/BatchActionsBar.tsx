import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, X, Trash2 } from 'lucide-react';

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
    /** 清除选择回调 */
    onClearSelection: () => void;
    /** 是否禁用操作按钮 */
    disabled?: boolean;
}

/**
 * 批量操作工具栏组件
 * 
 * 功能：
 * - 显示选中数量
 * - 批量延长按钮
 * - 批量删除按钮
 * - 清除选择按钮
 */
export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
    selectedCount,
    onBatchExtend,
    onBatchDelete,
    onClearSelection,
    disabled = false,
}) => {
    // 如果没有选中项，不显示工具栏
    if (selectedCount === 0) {
        return null;
    }

    return (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            {/* 左侧：选中数量 */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    已选中 {selectedCount} 个 API Key
                </span>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchExtend}
                    className="flex items-center gap-2"
                    disabled={disabled}
                >
                    <Clock className="w-4 h-4" />
                    批量延长有效期
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchDelete}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    disabled={disabled}
                >
                    <Trash2 className="w-4 h-4" />
                    批量删除
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="flex items-center gap-2"
                    disabled={disabled}
                >
                    <X className="w-4 h-4" />
                    清除选择
                </Button>
            </div>
        </div>
    );
};
