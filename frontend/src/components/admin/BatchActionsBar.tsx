import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, X, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_HOVERABLE_BUTTON_CLASSES } from '@/components/admin/adminDesign';

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
 * 批量操作工具栏组件
 * 
 * 功能：
 * - 显示选中数量
 * - 批量延长按钮
 * - 批量导出按钮
 * - 批量删除按钮
 * - 清除选择按钮
 */
export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
    selectedCount,
    onBatchExtend,
    onBatchDelete,
    onBatchExport,
    onClearSelection,
    disabled = false,
}) => {
    // 如果没有选中项，不显示工具栏
    if (selectedCount === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* 左侧：选中数量 */}
            <div className="flex items-center gap-2 rounded-[1.1rem] border-[0.5px] border-cyan-200/50 bg-cyan-50/60 px-3 py-1.5 shadow-sm dark:border-cyan-900/30 dark:bg-cyan-950/20">
                <span className="hidden text-sm font-medium text-cyan-900 dark:text-cyan-100 sm:inline">
                    已选中 {selectedCount} 个
                </span>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchExtend}
                    className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'flex h-9 items-center gap-2 border-slate-200/50 text-slate-700 dark:border-cyan-300/[0.14] dark:text-slate-200')}
                    disabled={disabled}
                >
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">批量延长有效期</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchExport}
                    className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'flex h-9 items-center gap-2 border-slate-200/50 text-slate-700 hover:text-slate-900 dark:border-cyan-300/[0.14] dark:text-slate-200')}
                    disabled={disabled}
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">批量导出</span>
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBatchDelete}
                    className="flex h-9 items-center gap-2 rounded-full border-[0.5px] border-red-200/60 text-red-600 hover:bg-red-50/80 hover:text-red-700 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                    disabled={disabled}
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">批量删除</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="flex h-9 items-center gap-2 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 text-slate-700 backdrop-blur-md hover:bg-white/60 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-200 dark:hover:border-cyan-300/[0.24] dark:hover:bg-cyan-400/[0.08]"
                    disabled={disabled}
                >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">清除选择</span>
                </Button>
            </div>
        </div>
    );
};
