import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
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
            await AuthService.createApiKey(ttlHours, description, dailySearchLimit);
            toast.success('API Key 创建成功');
            resetForm();
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('创建 API Key 失败:', error);
            if (error.response?.status === 401) {
                toast.error('未授权：请重新登录');
            } else if (error.response?.status === 403) {
                toast.error('权限不足：需要管理员权限');
            } else {
                toast.error('创建失败：' + (error.message || '未知错误'));
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
    };

    const handleClose = () => {
        if (!isLoading) {
            resetForm();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>生成 API Key</DialogTitle>
                    <DialogDescription>
                        创建新的 API Key，支持自定义有效期和搜索限制
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* 有效期选择 */}
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

                    {/* 自定义天数 */}
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

                    {/* 每日搜索次数限制 */}
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

                    {/* 描述 */}
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
            </DialogContent>
        </Dialog>
    );
}
