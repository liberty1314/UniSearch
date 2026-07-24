import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AppleInput } from '@/components/ui/AppleInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BannedIPService } from '@/services/bannedIPService';
import { getErrorDataError, getErrorMessage, getErrorStatus } from '@/lib/error';
import { cn } from '@/lib/utils';

interface BanIPDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

type DurationMode = 'permanent' | 'temporary';

// 简单的 IPv4 / IPv6 格式校验（宽松匹配，最终以后端校验为准）
const IP_PATTERN =
    /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

/**
 * 手动封禁 IP 对话框
 *
 * 允许管理员手动封禁指定 IP，支持：
 * - IP 地址输入（必填）
 * - 封禁原因（可选）
 * - 封禁时长：永久或指定分钟数（映射到 duration_minutes）
 */
export function BanIPDialog({ open, onOpenChange, onSuccess }: BanIPDialogProps) {
    const [ip, setIp] = useState('');
    const [reason, setReason] = useState('');
    const [durationMode, setDurationMode] = useState<DurationMode>('permanent');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setIp('');
            setReason('');
            setDurationMode('permanent');
            setDurationMinutes('');
        }
    }, [open]);

    const validateForm = (): boolean => {
        const trimmedIp = ip.trim();

        if (!trimmedIp) {
            toast.error('请输入 IP 地址');
            return false;
        }

        if (!IP_PATTERN.test(trimmedIp)) {
            toast.error('请输入有效的 IP 地址');
            return false;
        }

        if (durationMode === 'temporary') {
            const minutes = Number(durationMinutes);
            if (!Number.isFinite(minutes) || minutes <= 0) {
                toast.error('请输入大于 0 的封禁时长（分钟）');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        const trimmedIp = ip.trim();
        const trimmedReason = reason.trim();
        const minutes =
            durationMode === 'temporary' ? Number(durationMinutes) : undefined;

        setIsLoading(true);
        try {
            await BannedIPService.banIP(trimmedIp, trimmedReason || undefined, minutes);
            toast.success(`已封禁 IP "${trimmedIp}"`);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('封禁 IP 失败:', error);
            const status = getErrorStatus(error);
            if (status === 401) {
                toast.error('未授权：请重新登录');
            } else if (status === 403) {
                toast.error('权限不足：需要管理员权限');
            } else if (status === 409) {
                toast.error(getErrorDataError(error) || '该 IP 已在封禁列表中');
            } else if (status === 400) {
                toast.error('参数错误：' + (getErrorDataError(error) || '请检查输入'));
            } else {
                toast.error('封禁失败：' + (getErrorDataError(error) || getErrorMessage(error)));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            onOpenChange(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            void handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>手动封禁 IP</DialogTitle>
                    <DialogDescription>
                        封禁指定 IP 地址，可设置封禁原因与时长
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* IP 地址输入 */}
                    <AppleInput
                        label="IP 地址"
                        id="ban-ip"
                        type="text"
                        placeholder="例如 192.168.1.1"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        autoComplete="off"
                        required
                    />

                    {/* 封禁原因输入 */}
                    <AppleInput
                        label="封禁原因（可选）"
                        id="ban-reason"
                        type="text"
                        placeholder="请输入封禁原因"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        autoComplete="off"
                    />

                    {/* 封禁时长选择 */}
                    <div className="space-y-2">
                        <Label>封禁时长</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(
                                [
                                    { value: 'permanent', label: '永久封禁' },
                                    { value: 'temporary', label: '指定时长' },
                                ] as const
                            ).map((option) => {
                                const isActive = durationMode === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setDurationMode(option.value)}
                                        disabled={isLoading}
                                        className={cn(
                                            'rounded-[1.05rem] border px-4 py-2.5 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'border-cyan-300/80 bg-cyan-50/80 text-cyan-700 dark:border-cyan-300/[0.34] dark:bg-cyan-950/25 dark:text-cyan-300'
                                                : 'border-slate-200/70 bg-white/60 text-slate-600 hover:bg-white/80 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300'
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        {durationMode === 'temporary' && (
                            <AppleInput
                                id="ban-duration"
                                type="number"
                                min={1}
                                placeholder="封禁时长（分钟）"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                autoComplete="off"
                                helperText="从当前时间起，超过该时长后自动解封"
                            />
                        )}
                        {durationMode === 'permanent' && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                永久封禁将持续生效，直到手动解封。
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        取消
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => void handleSubmit()}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        确认封禁
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
