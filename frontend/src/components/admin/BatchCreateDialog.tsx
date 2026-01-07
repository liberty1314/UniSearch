import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import type { APIKeyInfo } from '@/types/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Download, Check } from 'lucide-react';
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
    // 表单状态
    const [count, setCount] = useState<string>('10'); // 默认创建 10 个
    const [ttlHours, setTtlHours] = useState<string>('720'); // 默认 30 天
    const [descriptionPrefix, setDescriptionPrefix] = useState<string>('批量生成-');

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 创建结果
    const [createdKeys, setCreatedKeys] = useState<APIKeyInfo[]>([]);
    const [showResults, setShowResults] = useState<boolean>(false);

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
            setCreatedKeys([]);
            setShowResults(false);
            setShowConfirm(false);
        }
    }, [open]);

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
                descriptionPrefix
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
                            <div className="space-y-2">
                                <Label htmlFor="count">创建数量</Label>
                                <Input
                                    id="count"
                                    type="number"
                                    min="1"
                                    max="100"
                                    placeholder="例如：10"
                                    value={count}
                                    onChange={(e) => setCount(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    一次最多创建 100 个 API Key
                                </p>
                            </div>

                            {/* 有效期输入 */}
                            <div className="space-y-2">
                                <Label htmlFor="ttl-hours">有效期（小时）</Label>
                                <Input
                                    id="ttl-hours"
                                    type="number"
                                    min="1"
                                    placeholder="例如：720（30天）"
                                    value={ttlHours}
                                    onChange={(e) => setTtlHours(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    所有密钥将使用相同的有效期
                                </p>
                                {ttlHours && !isNaN(Number(ttlHours)) && Number(ttlHours) > 0 && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        有效期约 {calculateDays()} 天
                                    </p>
                                )}
                            </div>

                            {/* 描述前缀输入 */}
                            <div className="space-y-2">
                                <Label htmlFor="description-prefix">描述前缀（可选）</Label>
                                <Input
                                    id="description-prefix"
                                    type="text"
                                    placeholder="例如：批量生成-"
                                    value={descriptionPrefix}
                                    onChange={(e) => setDescriptionPrefix(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    每个密钥的描述将为：前缀 + 序号（如"批量生成-1"）
                                </p>
                            </div>

                            {/* 操作进度提示 */}
                            {isLoading && (
                                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        正在创建，请稍候...
                                    </span>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                取消
                            </Button>
                            <Button
                                onClick={handleBatchCreateClick}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        创建中...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        开始创建
                                    </>
                                )}
                            </Button>
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
                                                    {formatDateTime(key.expires_at)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={handleExportCSV}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                导出为 CSV
                            </Button>
                            <Button onClick={handleClose}>
                                完成
                            </Button>
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
