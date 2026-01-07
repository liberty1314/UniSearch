import React, { useState } from 'react';
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

/**
 * 生成 Key 对话框组件
 * 
 * 允许管理员创建新的 API Key，可以选择有效期和输入描述信息
 */
export function CreateKeyDialog({ open, onOpenChange, onSuccess }: CreateKeyDialogProps) {
    // 有效期（小时）
    const [ttlHours, setTtlHours] = useState<number>(720); // 默认 30 天

    // 描述信息
    const [description, setDescription] = useState<string>('');

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /**
     * 处理创建 API Key
     */
    const handleCreate = async () => {
        setIsLoading(true);

        try {
            // 调用 API 创建 Key
            await AuthService.createApiKey(ttlHours, description);

            toast.success('API Key 创建成功');

            // 重置表单
            setDescription('');
            setTtlHours(720);

            // 通知父组件刷新列表
            onSuccess();

            // 关闭对话框
            onOpenChange(false);
        } catch (error: any) {
            console.error('创建 API Key 失败:', error);

            // 显示错误提示
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

    /**
     * 处理对话框关闭
     */
    const handleClose = () => {
        if (!isLoading) {
            // 重置表单
            setDescription('');
            setTtlHours(720);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>生成新 API Key</DialogTitle>
                    <DialogDescription>
                        创建一个新的 API Key，用于访问系统功能
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 有效期选择 */}
                    <div className="space-y-2">
                        <Label htmlFor="ttl">有效期</Label>
                        <Select
                            value={ttlHours.toString()}
                            onValueChange={(value) => setTtlHours(Number(value))}
                            disabled={isLoading}
                        >
                            <SelectTrigger id="ttl">
                                <SelectValue placeholder="选择有效期" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="168">7 天</SelectItem>
                                <SelectItem value="720">30 天</SelectItem>
                                <SelectItem value="2160">90 天</SelectItem>
                                <SelectItem value="8760">1 年</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            API Key 将在选定时间后过期
                        </p>
                    </div>

                    {/* 描述输入 */}
                    <div className="space-y-2">
                        <Label htmlFor="description">描述（可选）</Label>
                        <Input
                            id="description"
                            type="text"
                            placeholder="例如：生产环境密钥"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isLoading}
                            maxLength={100}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            为这个 API Key 添加备注信息
                        </p>
                    </div>
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
