import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { APIKeyInfo } from '@/types/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AppleButton } from '@/components/ui/AppleButton';
import { Download, Copy, FileText } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

/**
 * 批量导出对话框组件属性
 */
interface BatchExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedKeys: APIKeyInfo[];
}

/**
 * 批量导出 API Key 对话框组件
 * 
 * 功能：
 * - 显示选中的 API Key 列表
 * - 提供自定义复制格式
 * - 支持复制全部
 * - 支持导出为 CSV
 */
export function BatchExportDialog({
    open,
    onOpenChange,
    selectedKeys,
}: BatchExportDialogProps) {
    // 复制格式设置
    const [enableCopyFormat, setEnableCopyFormat] = useState<boolean>(true);
    const [copyFormatTemplate, setCopyFormatTemplate] = useState<string>('卡密：{key}，网址：https://unisearchso.xyz/');

    /**
     * 当对话框打开时，重置设置
     */
    useEffect(() => {
        if (open) {
            setEnableCopyFormat(true);
            setCopyFormatTemplate('卡密：{key}，网址：https://unisearchso.xyz/');
        }
    }, [open]);

    /**
     * 导出为 CSV
     */
    const handleExportCSV = () => {
        if (selectedKeys.length === 0) {
            toast.error('没有可导出的数据');
            return;
        }

        try {
            // 构建 CSV 内容
            const headers = ['API Key', '描述', '创建时间', '过期时间', '状态', '每日限额'];
            const rows = selectedKeys.map(key => [
                key.key,
                key.description || '',
                key.created_at,
                key.is_permanent ? '永不过期' : key.expires_at,
                key.is_enabled ? '启用' : '禁用',
                key.daily_search_limit?.toString() || '不限制',
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
            link.download = `api_keys_export_${new Date().toISOString().slice(0, 10)}.csv`;
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
        if (selectedKeys.length === 0) {
            toast.error('没有可复制的数据');
            return;
        }

        try {
            let formattedKeys: string;
            
            if (enableCopyFormat && copyFormatTemplate.trim()) {
                // 使用自定义格式模板，将 {key} 替换为实际的 API Key
                formattedKeys = selectedKeys.map(key => 
                    copyFormatTemplate.replace(/{key}/g, key.key)
                ).join('\n');
            } else {
                // 不使用格式，直接复制 API Key
                formattedKeys = selectedKeys.map(key => key.key).join('\n');
            }
            
            // 复制到剪贴板
            navigator.clipboard.writeText(formattedKeys).then(() => {
                toast.success(`已复制 ${selectedKeys.length} 个 API Key`);
            }).catch(() => {
                // 降级方案：使用旧的复制方法
                const textArea = document.createElement('textarea');
                textArea.value = formattedKeys;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    toast.success(`已复制 ${selectedKeys.length} 个 API Key`);
                } catch {
                    toast.error('复制失败，请手动复制');
                } finally {
                    document.body.removeChild(textArea);
                }
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
        onOpenChange(false);
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
                        <FileText className="w-5 h-5" />
                        批量导出 API Key
                    </DialogTitle>
                    <DialogDescription>
                        已选中 {selectedKeys.length} 个 API Key，可以复制或导出为 CSV 文件
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 结果列表 */}
                    <div className="rounded-md border max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>API Key</TableHead>
                                    <TableHead>描述</TableHead>
                                    <TableHead>过期时间</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedKeys.map((key) => (
                                    <TableRow key={key.key}>
                                        <TableCell className="font-mono text-xs">
                                            {formatKeyDisplay(key.key)}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {key.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {key.is_permanent 
                                                ? '永不过期'
                                                : key.first_used_at 
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
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md border">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="enable-copy-format"
                                checked={enableCopyFormat}
                                onChange={(e) => setEnableCopyFormat(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="enable-copy-format" className="text-sm font-medium cursor-pointer">
                                复制时追加格式文本
                            </label>
                        </div>

                        {enableCopyFormat && (
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400">
                                    自定义格式模板（使用 {'{key}'} 作为占位符）
                                </label>
                                <input
                                    type="text"
                                    value={copyFormatTemplate}
                                    onChange={(e) => setCopyFormatTemplate(e.target.value)}
                                    placeholder="卡密：{key}，网址：https://unisearchso.xyz/"
                                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <p className="text-xs text-gray-500">
                                    示例：卡密：{formatKeyDisplay(selectedKeys[0]?.key || 'sk-xxx')}，网址：https://unisearchso.xyz/
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <AppleButton
                        variant="secondary"
                        onClick={handleClose}
                    >
                        取消
                    </AppleButton>
                    <AppleButton
                        variant="secondary"
                        onClick={handleCopyAll}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        复制全部
                    </AppleButton>
                    <AppleButton
                        variant="primary"
                        onClick={handleExportCSV}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        导出 CSV
                    </AppleButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
