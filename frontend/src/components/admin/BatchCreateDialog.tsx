import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import type { APIKeyInfo } from '@/types/api';
import { buildCopyFormatPreview, getCopyFormatTemplate } from '@/lib/publicSiteConfig';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AppleInput } from '@/components/ui/AppleInput';
import { AppleButton } from '@/components/ui/AppleButton';
import { Plus, Loader2, Download, Check, Copy } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * 批量创建对话框组件属性
 */
interface BatchCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (keys: APIKeyInfo[]) => void;
}

/**
 * 批量创建 API Key 对话框组件
 * 
 * 功能：
 * - 提供创建数量输入框（1-100）
 * - 提供有效期输入框（小时）
 * - 提供可选的描述前缀输入框
 * - 实现表单验证
 * - 显示创建进度
 * - 显示创建结果列表
 * - 提供 CSV 导出功能
 */
export function BatchCreateDialog({
    open,
    onOpenChange,
    onSuccess,
}: BatchCreateDialogProps) {
    const defaultCopyTemplate = getCopyFormatTemplate();
    // 表单状态
    const [count, setCount] = useState<string>('10'); // 默认创建 10 个
    const [ttlHours, setTtlHours] = useState<string>('720'); // 默认 30 天
    const [descriptionPrefix, setDescriptionPrefix] = useState<string>('批量生成-');
    const [dailySearchLimit, setDailySearchLimit] = useState<string>('5'); // 默认每日5次

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 创建结果
    const [createdKeys, setCreatedKeys] = useState<APIKeyInfo[]>([]);
    const [showResults, setShowResults] = useState<boolean>(false);

    // 复制格式设置
    const [enableCopyFormat, setEnableCopyFormat] = useState<boolean>(true);
    const [copyFormatTemplate, setCopyFormatTemplate] = useState<string>(defaultCopyTemplate);

    // 确认对话框状态
    const [showConfirm, setShowConfirm] = useState<boolean>(false);

    /**
     * 当对话框打开时，重置表单
     */
    useEffect(() => {
        if (open) {
            setCount('10');
            setTtlHours('720');
            setDescriptionPrefix('批量生成-');
            setDailySearchLimit('5');
            setCreatedKeys([]);
            setShowResults(false);
            setShowConfirm(false);
            setEnableCopyFormat(true);
            setCopyFormatTemplate(defaultCopyTemplate);
        }
    }, [defaultCopyTemplate, open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        let cancelled = false;
        SystemSettingsService.getSettingsCached()
            .then((settings) => {
                if (!cancelled) {
                    setCopyFormatTemplate(getCopyFormatTemplate(settings));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCopyFormatTemplate(defaultCopyTemplate);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [defaultCopyTemplate, open]);

    /**
     * 验证表单
     */
    const validateForm = (): boolean => {
        // 验证数量
        const countNum = Number(count);
        if (!count || isNaN(countNum) || countNum < 1 || countNum > 100) {
            toast.error('请输入有效的创建数量（1-100）');
            return false;
        }

        // 验证有效期
        const ttlNum = Number(ttlHours);
        if (!ttlHours || isNaN(ttlNum) || ttlNum <= 0) {
            toast.error('请输入有效的有效期小时数（大于 0）');
            return false;
        }

        return true;
    };

    /**
     * 处理批量创建按钮点击 - 显示确认对话框
     */
    const handleBatchCreateClick = () => {
        if (!validateForm()) {
            return;
        }
        setShowConfirm(true);
    };

    /**
     * 处理批量创建确认
     */
    const handleBatchCreate = async () => {
        setShowConfirm(false);
        setIsLoading(true);

        try {
            // 调用批量创建 API
            const result = await AuthService.batchCreateApiKeys(
                Number(count),
                Number(ttlHours),
                descriptionPrefix,
                Number(dailySearchLimit) || 0
            );

            // 保存创建结果
            setCreatedKeys(result.keys);
            setShowResults(true);

            // 显示操作结果
            if (result.failed_count === 0) {
                toast.success(`成功创建 ${result.success_count} 个 API Key`);
            } else {
                toast.warning(
                    `批量创建完成：成功 ${result.success_count} 个，失败 ${result.failed_count} 个`
                );
            }

            // 通知父组件刷新列表
            onSuccess(result.keys);
        } catch (error: unknown) {
            console.error('批量创建失败:', error);

            // 显示错误提示
            if (error && typeof error === 'object' && 'response' in error) {
                const err = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
                if (err.response?.status === 401) {
                    toast.error('未授权：请重新登录');
                } else if (err.response?.status === 403) {
                    toast.error('权限不足：需要管理员权限');
                } else if (err.response?.status === 400) {
                    toast.error('参数错误：' + (err.response?.data?.error || '请检查输入'));
                } else {
                    toast.error('批量创建失败：' + (err.message || '未知错误'));
                }
            } else {
                toast.error('批量创建失败：未知错误');
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 导出为 CSV
     */
    const handleExportCSV = () => {
        if (createdKeys.length === 0) {
            toast.error('没有可导出的数据');
            return;
        }

        try {
            // 构建 CSV 内容
            const headers = ['API Key', '描述', '创建时间', '过期时间', '状态'];
            const rows = createdKeys.map(key => [
                key.key,
                key.description || '',
                key.created_at,
                key.expires_at,
                key.is_enabled ? '启用' : '禁用',
            ]);

            // 组合 CSV 字符串
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
            ].join('\n');

            // 创建 Blob 并触发下载
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `api_keys_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('CSV 文件已导出');
        } catch (error) {
            console.error('导出 CSV 失败:', error);
            toast.error('导出失败，请重试');
        }
    };

    /**
     * 复制所有 API Key
     */
    const handleCopyAll = () => {
        if (createdKeys.length === 0) {
            toast.error('没有可复制的数据');
            return;
        }

        try {
            let formattedKeys: string;

            if (enableCopyFormat && copyFormatTemplate.trim()) {
                // 使用自定义格式模板，将 {key} 替换为实际的 API Key
                formattedKeys = createdKeys.map(key =>
                    copyFormatTemplate.replace(/{key}/g, key.key)
                ).join('\n');
            } else {
                // 不使用格式，直接复制 API Key
                formattedKeys = createdKeys.map(key => key.key).join('\n');
            }

            // 复制到剪贴板
            navigator.clipboard.writeText(formattedKeys).then(() => {
                toast.success(`已复制 ${createdKeys.length} 个 API Key`);
            }).catch(() => {
                // 降级方案：使用旧的复制方法
                const textArea = document.createElement('textarea');
                textArea.value = formattedKeys;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                toast.success(`已复制 ${createdKeys.length} 个 API Key`);
            });
        } catch (error) {
            console.error('复制失败:', error);
            toast.error('复制失败，请重试');
        }
    };

    /**
     * 处理对话框关闭
     */
    const handleClose = () => {
        if (!isLoading) {
            onOpenChange(false);
        }
    };

    /**
     * 计算天数
     */
    const calculateDays = (): number => {
        const hours = Number(ttlHours);
        if (isNaN(hours) || hours <= 0) return 0;
        return Math.floor(hours / 24);
    };

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
     * 格式化 API Key 显示
     */
    const formatKeyDisplay = (key: string): string => {
        if (key.length <= 20) return key;
        return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        批量生成 API Key
                    </DialogTitle>
                    <DialogDescription>
                        批量创建多个 API Key，并可导出为 CSV 文件
                    </DialogDescription>
                </DialogHeader>

                {!showResults ? (
                    // 表单视图
                    <>
                        <div className="space-y-4 py-4">
                            {/* 创建数量输入 */}
                            <AppleInput
                                label="创建数量"
                                id="count"
                                type="number"
                                min="1"
                                max="100"
                                placeholder="例如：10"
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                disabled={isLoading}
                                helperText="一次最多创建 100 个 API Key"
                            />

                            {/* 有效期输入 */}
                            <AppleInput
                                label="有效期（小时）"
                                id="ttl-hours"
                                type="number"
                                min="1"
                                placeholder="例如：720（30天）"
                                value={ttlHours}
                                onChange={(e) => setTtlHours(e.target.value)}
                                disabled={isLoading}
                                helperText={
                                    ttlHours && !isNaN(Number(ttlHours)) && Number(ttlHours) > 0
                                        ? `有效期约 ${calculateDays()} 天`
                                        : "所有密钥将使用相同的有效期"
                                }
                            />

                            {/* 描述前缀输入 */}
                            <AppleInput
                                label="描述前缀（可选）"
                                id="description-prefix"
                                type="text"
                                placeholder="例如：批量生成-"
                                value={descriptionPrefix}
                                onChange={(e) => setDescriptionPrefix(e.target.value)}
                                disabled={isLoading}
                                helperText='每个密钥的描述将为：前缀 + 序号（如"批量生成-1"）'
                            />

                            {/* 每日搜索限制输入 */}
                            <AppleInput
                                label="每日搜索次数限制"
                                id="daily-search-limit"
                                type="number"
                                min="0"
                                placeholder="例如：10（0表示不限制）"
                                value={dailySearchLimit}
                                onChange={(e) => setDailySearchLimit(e.target.value)}
                                disabled={isLoading}
                                helperText="设置为 0 表示不限制每日搜索次数"
                            />

                            {/* 操作进度提示 */}
                            {isLoading && (
                                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                                    <span className="text-sm text-gray-600 dark:text-slate-400">
                                        正在创建，请稍候...
                                    </span>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <AppleButton
                                variant="secondary"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                取消
                            </AppleButton>
                            <AppleButton
                                variant="primary"
                                onClick={handleBatchCreateClick}
                                loading={isLoading}
                                disabled={isLoading}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                开始创建
                            </AppleButton>
                        </DialogFooter>
                    </>
                ) : (
                    // 结果视图
                    <>
                        <div className="space-y-4 py-4">
                            {/* 成功提示 */}
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <div className="text-sm text-green-900 dark:text-green-100">
                                    <span className="font-medium">
                                        成功创建 {createdKeys.length} 个 API Key
                                    </span>
                                </div>
                            </div>

                            {/* 结果列表 */}
                            <div className="rounded-md border max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>API Key</TableHead>
                                            <TableHead>描述</TableHead>
                                            <TableHead>过期时间</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {createdKeys.map((key) => (
                                            <TableRow key={key.key}>
                                                <TableCell className="font-mono text-xs">
                                                    {formatKeyDisplay(key.key)}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {key.description}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {key.first_used_at
                                                        ? formatDateTime(key.expires_at)
                                                        : '待激活'
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* 复制格式设置 */}
                            <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-md border">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="enable-copy-format"
                                        checked={enableCopyFormat}
                                        onChange={(e) => setEnableCopyFormat(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-cyan-500"
                                    />
                                    <label htmlFor="enable-copy-format" className="text-sm font-medium cursor-pointer">
                                        复制时追加格式文本
                                    </label>
                                </div>

                                {enableCopyFormat && (
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-600 dark:text-slate-400">
                                            自定义格式模板（使用 {'{key}'} 作为占位符）
                                        </label>
                                        <input
                                            type="text"
                                            value={copyFormatTemplate}
                                            onChange={(e) => setCopyFormatTemplate(e.target.value)}
                                            placeholder={defaultCopyTemplate}
                                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-700 dark:border-slate-700"
                                        />
                                        <p className="text-xs text-gray-500">
                                            示例：{buildCopyFormatPreview(undefined, formatKeyDisplay(createdKeys[0]?.key || 'sk-xxx'), copyFormatTemplate)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <AppleButton
                                variant="secondary"
                                onClick={handleCopyAll}
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                复制全部
                            </AppleButton>
                            <AppleButton
                                variant="secondary"
                                onClick={handleExportCSV}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                导出为 CSV
                            </AppleButton>
                            <AppleButton
                                variant="primary"
                                onClick={handleClose}
                            >
                                完成
                            </AppleButton>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>

            {/* 确认对话框 */}
            <ConfirmDialog
                open={showConfirm}
                onOpenChange={setShowConfirm}
                title="确认批量创建"
                description={`您确定要创建 ${count} 个 API Key 吗？每个密钥的有效期为 ${ttlHours} 小时（约 ${calculateDays()} 天）。`}
                confirmText="确认创建"
                cancelText="取消"
                onConfirm={handleBatchCreate}
                isLoading={isLoading}
            />
        </Dialog>
    );
}
