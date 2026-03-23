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
import { AppleInput } from '@/components/ui/AppleInput';
import { AppleButton } from '@/components/ui/AppleButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getErrorDataError, getErrorMessage, getErrorStatus } from '@/lib/error';
import {
    API_KEY_EXTENSION_OPTIONS,
    convertDaysToHours,
    CUSTOM_EXTENSION_OPTION,
    getExtendedExpiryDate,
    isValidPositiveIntegerDays,
    resolveExtensionDays,
} from './apiKeyExtensionOptions';

/**
 * 编辑 API Key 对话框组件属性
 */
interface EditKeyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    apiKey: APIKeyInfo;
    onSuccess: () => void;
}

/**
 * 编辑 API Key 对话框组件
 * 
 * 允许管理员编辑 API Key 的有效期，提供两种方式：
 * 1. 设置新的过期日期时间
 * 2. 按天延长有效期
 */
export function EditKeyDialog({ open, onOpenChange, apiKey, onSuccess }: EditKeyDialogProps) {
    // 当前选择的编辑方式
    const [editMode, setEditMode] = useState<'datetime' | 'extend'>('extend');

    // 新的过期时间（日期时间选择器模式）
    const [newExpiresAt, setNewExpiresAt] = useState<string>('');

    // 延长天数选项（延长模式）
    const [extendOption, setExtendOption] = useState<string>('');

    // 自定义延长天数
    const [customExtendDays, setCustomExtendDays] = useState<string>('');

    // 每日搜索次数限制
    const [dailySearchLimit, setDailySearchLimit] = useState<string>('');

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /**
     * 当对话框打开或 apiKey 变化时，初始化表单
     */
    useEffect(() => {
        if (open && apiKey) {
            // 将 ISO 时间转换为本地日期时间格式（用于 datetime-local input）
            const expiresDate = new Date(apiKey.expires_at);
            const localDateTime = new Date(expiresDate.getTime() - expiresDate.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            setNewExpiresAt(localDateTime);
            setExtendOption('');
            setCustomExtendDays('');
            setDailySearchLimit(apiKey.daily_search_limit.toString()); // 初始化为当前值
            setEditMode('extend'); // 默认使用延长模式
        }
    }, [open, apiKey]);

    /**
     * 格式化日期时间显示
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

    const resolvedExtendDays = resolveExtensionDays(extendOption, customExtendDays);
    const isCustomExtend = extendOption === CUSTOM_EXTENSION_OPTION;
    const originalExpiresDate = new Date(apiKey.expires_at);
    const initialLocalDateTime = new Date(originalExpiresDate.getTime() - originalExpiresDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    const parsedDailySearchLimit = dailySearchLimit === '' ? undefined : Number(dailySearchLimit);
    const dailyLimitChanged = parsedDailySearchLimit !== undefined && parsedDailySearchLimit !== apiKey.daily_search_limit;
    const expiresAtChanged = editMode === 'datetime' && newExpiresAt !== initialLocalDateTime;
    const extendDaysChanged = editMode === 'extend' && resolvedExtendDays !== null && resolvedExtendDays > 0;

    /**
     * 处理更新 API Key
     */
    const handleUpdate = async () => {
        if (dailySearchLimit !== '' && (isNaN(Number(dailySearchLimit)) || Number(dailySearchLimit) < 0 || !Number.isInteger(Number(dailySearchLimit)))) {
            toast.error('每日搜索次数限制必须是大于等于 0 的整数');
            return;
        }

        if (editMode === 'datetime' && expiresAtChanged) {
            if (!newExpiresAt) {
                toast.error('请选择新的过期时间');
                return;
            }

            const newDate = new Date(newExpiresAt);
            if (newDate <= new Date()) {
                toast.error('新的过期时间必须晚于当前时间');
                return;
            }
        }

        if (editMode === 'extend' && isCustomExtend && !isValidPositiveIntegerDays(customExtendDays)) {
            toast.error('请输入有效的自定义天数（大于 0 的整数）');
            return;
        }

        if (!dailyLimitChanged && !expiresAtChanged && !extendDaysChanged) {
            toast.info('未检测到变更');
            return;
        }

        setIsLoading(true);

        try {
            // 准备更新参数
            const limit = dailyLimitChanged ? parsedDailySearchLimit : undefined;

            // 根据编辑模式调用不同的 API
            if (expiresAtChanged) {
                // 设置新时间模式：将本地时间转换为 ISO 8601 格式
                const newDate = new Date(newExpiresAt);
                const isoString = newDate.toISOString();
                await AuthService.updateApiKey(apiKey.key, isoString, undefined, limit);
            } else if (extendDaysChanged) {
                // 延长模式
                await AuthService.updateApiKey(apiKey.key, undefined, convertDaysToHours(resolvedExtendDays), limit);
            } else {
                await AuthService.updateApiKey(apiKey.key, undefined, undefined, limit);
            }

            toast.success('API Key 已更新');

            // 通知父组件刷新列表
            onSuccess();

            // 关闭对话框
            onOpenChange(false);
        } catch (error) {
            console.error('更新 API Key 失败:', error);

            // 显示错误提示
            const status = getErrorStatus(error);
            if (status === 401) {
                toast.error('未授权：请重新登录');
            } else if (status === 403) {
                toast.error('权限不足：需要管理员权限');
            } else if (status === 400) {
                toast.error('参数错误：' + (getErrorDataError(error) || '请检查输入'));
            } else {
                toast.error('更新失败：' + getErrorMessage(error));
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
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>编辑 API Key</DialogTitle>
                    <DialogDescription>
                        修改 API Key 的过期时间和每日搜索次数限制
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 显示当前信息 */}
                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                        <div className="text-sm">
                            <span className="text-gray-600 dark:text-slate-400">API Key: </span>
                            <span className="font-mono text-xs">
                                {apiKey.key.substring(0, 10)}...{apiKey.key.substring(apiKey.key.length - 10)}
                            </span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-600 dark:text-slate-400">当前过期时间: </span>
                            <span className="font-medium">
                                {apiKey.first_used_at 
                                    ? formatDateTime(apiKey.expires_at)
                                    : '待激活（首次使用时生效）'
                                }
                            </span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-600 dark:text-slate-400">当前每日限额: </span>
                            <span className="font-medium">
                                {apiKey.daily_search_limit > 0 ? apiKey.daily_search_limit : '无限制'}
                            </span>
                        </div>
                    </div>

                    {/* 每日搜索次数限制 */}
                    <AppleInput
                        label="每日搜索次数限制"
                        id="daily-search-limit"
                        type="number"
                        min="0"
                        placeholder="0 表示不限制"
                        value={dailySearchLimit}
                        onChange={(e) => setDailySearchLimit(e.target.value)}
                        disabled={isLoading}
                        helperText="0 表示不限制"
                    />

                    {/* 编辑方式选择 */}
                    <Tabs value={editMode} onValueChange={(value) => setEditMode(value as 'datetime' | 'extend')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="extend">延长有效期</TabsTrigger>
                            <TabsTrigger value="datetime">设置新时间</TabsTrigger>
                        </TabsList>

                        {/* 延长有效期模式 */}
                        <TabsContent value="extend" className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                                    延长天数
                                </label>
                                <Select
                                    value={extendOption}
                                    onValueChange={setExtendOption}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger aria-label="延长天数">
                                        <SelectValue placeholder="不延长（默认）" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {API_KEY_EXTENSION_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    默认不延长有效期；只有选择具体天数后才会续期
                                </p>
                                {extendOption ? (
                                    <button
                                        type="button"
                                        className="text-sm text-blue-600 transition-colors hover:text-blue-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                                        onClick={() => {
                                            setExtendOption('');
                                            setCustomExtendDays('');
                                        }}
                                        disabled={isLoading}
                                    >
                                        清除延长设置
                                    </button>
                                ) : null}
                            </div>

                            {isCustomExtend ? (
                                <AppleInput
                                    label="自定义延长天数"
                                    id="custom-extend-days"
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="请输入天数"
                                    value={customExtendDays}
                                    onChange={(e) => setCustomExtendDays(e.target.value)}
                                    disabled={isLoading}
                                    helperText="仅支持大于 0 的整数天数"
                                />
                            ) : null}

                            {resolvedExtendDays !== null && resolvedExtendDays > 0 && (
                                <p className="text-xs text-blue-600 dark:text-cyan-300">
                                    延长后过期时间: {formatDateTime(
                                        getExtendedExpiryDate(apiKey.expires_at, resolvedExtendDays)?.toISOString() ?? apiKey.expires_at
                                    )}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                未过期 Key 会在当前过期时间基础上续期；已过期 Key 从当前时间开始计算
                            </p>
                        </TabsContent>

                        {/* 设置新时间模式 */}
                        <TabsContent value="datetime" className="space-y-4">
                            <AppleInput
                                label="新的过期时间"
                                id="new-expires-at"
                                type="datetime-local"
                                value={newExpiresAt}
                                onChange={(e) => setNewExpiresAt(e.target.value)}
                                disabled={isLoading}
                                helperText="直接设置新的过期日期和时间"
                            />
                        </TabsContent>
                    </Tabs>
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
                        onClick={handleUpdate}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        确认更新
                    </AppleButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
