import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import type { APIKeyInfo } from '@/types/api';
import { getErrorMessage, getErrorStatus } from '@/lib/error';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/**
 * 生成 Key 对话框组件属性
 */
interface CreateKeyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

// 预设的有效期和默认每日搜索次数
const TTL_PRESETS = [
    { label: '1 天', hours: 24, defaultDailyLimit: 5 },
    { label: '7 天', hours: 168, defaultDailyLimit: 5 },
    { label: '30 天', hours: 720, defaultDailyLimit: 5 },
    { label: '90 天', hours: 2160, defaultDailyLimit: 5 },
    { label: '1 年', hours: 8760, defaultDailyLimit: 5 },
    { label: '自定义', hours: 0, defaultDailyLimit: 5 },
];

/**
 * 生成 Key 对话框组件
 */
export function CreateKeyDialog({ open, onOpenChange, onSuccess }: CreateKeyDialogProps) {
    const [ttlPreset, setTtlPreset] = useState<string>('720');
    const [customDays, setCustomDays] = useState<number>(30);
    const [dailySearchLimit, setDailySearchLimit] = useState<number>(5);
    const [description, setDescription] = useState<string>('');
    const [createdKey, setCreatedKey] = useState<APIKeyInfo | null>(null);
    const [showResult, setShowResult] = useState<boolean>(false);
    const [enableCopyFormat, setEnableCopyFormat] = useState<boolean>(true);
    const [copyFormatTemplate, setCopyFormatTemplate] = useState<string>('卡密：{key}，网址：https://unisearchso.xyz/');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 当选择预设时，自动更新每日搜索限制
    useEffect(() => {
        const preset = TTL_PRESETS.find(p => p.hours.toString() === ttlPreset);
        if (preset && preset.hours !== 0) {
            setDailySearchLimit(preset.defaultDailyLimit);
        }
    }, [ttlPreset]);

    // 计算实际的TTL小时数
    const getActualTtlHours = (): number => {
        if (ttlPreset === '0') {
            return customDays * 24;
        }
        return parseInt(ttlPreset);
    };

    /**
     * 处理创建
     */
    const handleCreate = async () => {
        const ttlHours = getActualTtlHours();

        if (ttlHours <= 0) {
            toast.error('请输入有效的天数');
            return;
        }

        setIsLoading(true);

        try {
            const key = await AuthService.createApiKey(ttlHours, description, dailySearchLimit);
            setCreatedKey(key);
            setShowResult(true);
            toast.success('API Key 创建成功');
            onSuccess();
        } catch (error) {
            console.error('创建 API Key 失败:', error);
            const status = getErrorStatus(error);
            if (status === 401) {
                toast.error('未授权：请重新登录');
            } else if (status === 403) {
                toast.error('权限不足：需要管理员权限');
            } else {
                toast.error('创建失败：' + getErrorMessage(error));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setDescription('');
        setTtlPreset('720');
        setCustomDays(30);
        setDailySearchLimit(5);
        setCreatedKey(null);
        setShowResult(false);
        setEnableCopyFormat(true);
        setCopyFormatTemplate('卡密：{key}，网址：https://unisearchso.xyz/');
    };

    const handleClose = () => {
        if (!isLoading) {
            resetForm();
            onOpenChange(false);
        }
    };

    const handleCopyKey = () => {
        if (!createdKey) {
            toast.error('没有可复制的 API Key');
            return;
        }

        const copyText = enableCopyFormat && copyFormatTemplate.trim()
            ? copyFormatTemplate.replace(/{key}/g, createdKey.key)
            : createdKey.key;

        navigator.clipboard.writeText(copyText).then(() => {
            toast.success('API Key 已复制');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = copyText;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('API Key 已复制');
        });
    };

    const formatKeyDisplay = (key: string): string => {
        if (key.length <= 20) return key;
        return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{showResult ? '创建成功' : '生成 API Key'}</DialogTitle>
                    <DialogDescription>
                        {showResult
                            ? '请复制并妥善保存该 API Key，关闭后将无法再次完整展示'
                            : '创建新的 API Key，支持自定义有效期和搜索限制'}
                    </DialogDescription>
                </DialogHeader>

                {!showResult ? (
                    <>
                        <div className="mt-4 space-y-4">
                            <div className="space-y-2">
                                <Label>有效期</Label>
                                <Select
                                    value={ttlPreset}
                                    onValueChange={setTtlPreset}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择有效期" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TTL_PRESETS.map((preset) => (
                                            <SelectItem key={preset.hours} value={preset.hours.toString()}>
                                                {preset.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {ttlPreset === '0' && (
                                <div className="space-y-2">
                                    <Label>自定义天数</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={3650}
                                        value={customDays}
                                        onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                                        disabled={isLoading}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>每日搜索次数限制</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={10000}
                                    value={dailySearchLimit}
                                    onChange={(e) => setDailySearchLimit(parseInt(e.target.value) || 0)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500">0 表示不限制</p>
                            </div>

                            <div className="space-y-2">
                                <Label>描述（可选）</Label>
                                <Input
                                    placeholder="例如：测试用户"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isLoading}
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                取消
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={isLoading}
                            >
                                {isLoading ? '生成中...' : '生成'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <div className="space-y-4 mt-4">
                            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                                成功创建 1 个 API Key
                            </div>

                            <div className="space-y-2 rounded-md border p-3">
                                <Label>API Key</Label>
                                <div className="break-all rounded bg-muted p-2 font-mono text-sm">
                                    {createdKey?.key}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    显示预览：{formatKeyDisplay(createdKey?.key || '')}
                                </p>
                            </div>

                            <div className="space-y-3 rounded-md border bg-gray-50 p-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="enable-copy-format-single"
                                        checked={enableCopyFormat}
                                        onChange={(e) => setEnableCopyFormat(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="enable-copy-format-single" className="cursor-pointer text-sm font-medium">
                                        复制时追加格式文本
                                    </label>
                                </div>

                                {enableCopyFormat && (
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-600">
                                            自定义格式模板（使用 {'{key}'} 作为占位符）
                                        </label>
                                        <Input
                                            value={copyFormatTemplate}
                                            onChange={(e) => setCopyFormatTemplate(e.target.value)}
                                            placeholder="卡密：{key}，网址：https://unisearchso.xyz/"
                                        />
                                        <p className="text-xs text-gray-500">
                                            示例：卡密：{formatKeyDisplay(createdKey?.key || 'sk-xxx')}，网址：https://unisearchso.xyz/
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={handleCopyKey}>
                                复制
                            </Button>
                            <Button onClick={handleClose}>
                                完成
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
