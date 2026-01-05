import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import type { APIKeyInfo, PluginInfo } from '@/types/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CreateKeyDialog } from '@/components/CreateKeyDialog';
import { Plus, Trash2, Copy, RefreshCw, Key, Activity } from 'lucide-react';

/**
 * 后台管理页面组件
 * 
 * 提供以下功能：
 * 1. API Key 管理（列表、创建、删除）
 * 2. 插件状态查看
 */
const Admin: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, logout } = useAuthStore();

    // API Keys 列表
    const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([]);
    const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(true);

    // 插件状态列表
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [isLoadingPlugins, setIsLoadingPlugins] = useState<boolean>(true);

    // 创建 Key 对话框状态
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);

    // 删除确认对话框状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    /**
     * 检查管理员权限
     */
    useEffect(() => {
        if (!isAdmin) {
            toast.error('需要管理员权限');
            navigate('/login');
        }
    }, [isAdmin, navigate]);

    /**
     * 设置页面标题
     */
    useEffect(() => {
        document.title = 'UniSearch - 管理后台';

        // 组件卸载时恢复默认标题
        return () => {
            document.title = 'UniSearch';
        };
    }, []);

    /**
     * 加载 API Keys 列表
     */
    const loadApiKeys = async () => {
        setIsLoadingKeys(true);
        try {
            const keys = await AuthService.listApiKeys();
            setApiKeys(keys);
        } catch (error: any) {
            console.error('加载 API Keys 失败:', error);

            if (error.response?.status === 401) {
                toast.error('登录已过期，请重新登录');
                logout();
                navigate('/login');
            } else {
                toast.error('加载 API Keys 失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoadingKeys(false);
        }
    };

    /**
     * 加载插件状态
     */
    const loadPlugins = async () => {
        setIsLoadingPlugins(true);
        try {
            // 调用插件状态接口
            const response = await fetch('/api/admin/plugins', {
                headers: {
                    'Authorization': `Bearer ${useAuthStore.getState().token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setPlugins(data.plugins || []);
            } else {
                throw new Error('获取插件状态失败');
            }
        } catch (error: any) {
            console.error('加载插件状态失败:', error);
            // 插件状态加载失败不影响主要功能，只记录错误
            setPlugins([]);
        } finally {
            setIsLoadingPlugins(false);
        }
    };

    /**
     * 初始加载数据
     */
    useEffect(() => {
        if (isAdmin) {
            loadApiKeys();
            loadPlugins();
        }
    }, [isAdmin]);

    /**
     * 处理创建 Key 成功
     */
    const handleCreateSuccess = () => {
        loadApiKeys();
    };

    /**
     * 打开删除确认对话框
     */
    const handleDeleteClick = (key: string) => {
        setKeyToDelete(key);
        setDeleteDialogOpen(true);
    };

    /**
     * 确认删除 API Key
     */
    const handleDeleteConfirm = async () => {
        if (!keyToDelete) return;

        setIsDeleting(true);
        try {
            await AuthService.deleteApiKey(keyToDelete);
            toast.success('API Key 已删除');

            // 刷新列表
            loadApiKeys();

            // 关闭对话框
            setDeleteDialogOpen(false);
            setKeyToDelete(null);
        } catch (error: any) {
            console.error('删除 API Key 失败:', error);

            if (error.response?.status === 401) {
                toast.error('登录已过期，请重新登录');
                logout();
                navigate('/login');
            } else {
                toast.error('删除失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * 复制 API Key 到剪贴板
     */
    const handleCopyKey = async (key: string) => {
        try {
            await navigator.clipboard.writeText(key);
            toast.success('API Key 已复制到剪贴板');
        } catch (error) {
            console.error('复制失败:', error);
            toast.error('复制失败，请手动复制');
        }
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
     * 格式化 API Key 显示（显示前后部分，中间省略）
     */
    const formatKeyDisplay = (key: string): string => {
        if (key.length <= 20) return key;
        return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
    };

    /**
     * 判断 Key 是否已过期
     */
    const isKeyExpired = (expiresAt: string): boolean => {
        return new Date(expiresAt) < new Date();
    };

    /**
     * 获取状态显示文本和样式
     */
    const getStatusDisplay = (key: APIKeyInfo) => {
        if (!key.is_enabled) {
            return { text: '已禁用', className: 'text-gray-500' };
        }
        if (isKeyExpired(key.expires_at)) {
            return { text: '已过期', className: 'text-red-500' };
        }
        return { text: '正常', className: 'text-green-500' };
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* 主内容区域 */}
            <div className="container mx-auto px-4 pt-6 pb-6 space-y-6">
                {/* API Key 管理面板 */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Key className="w-5 h-5" />
                                    API Key 管理
                                </CardTitle>
                                <CardDescription>
                                    管理系统的 API Keys，控制用户访问权限
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadApiKeys}
                                    disabled={isLoadingKeys}
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                    onClick={() => setIsCreateDialogOpen(true)}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    生成新 Key
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingKeys ? (
                            <div className="text-center py-8 text-gray-500">
                                加载中...
                            </div>
                        ) : apiKeys.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                暂无 API Keys，点击"生成新 Key"创建
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>API Key</TableHead>
                                            <TableHead>描述</TableHead>
                                            <TableHead>创建时间</TableHead>
                                            <TableHead>过期时间</TableHead>
                                            <TableHead>状态</TableHead>
                                            <TableHead className="text-right">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {apiKeys.map((key) => {
                                            const status = getStatusDisplay(key);
                                            const expired = isKeyExpired(key.expires_at);

                                            return (
                                                <TableRow
                                                    key={key.key}
                                                    className={expired || !key.is_enabled ? 'opacity-60' : ''}
                                                >
                                                    <TableCell className="font-mono text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span>{formatKeyDisplay(key.key)}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCopyKey(key.key)}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {key.description || <span className="text-gray-400">无</span>}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {formatDateTime(key.created_at)}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {formatDateTime(key.expires_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`font-medium ${status.className}`}>
                                                            {status.text}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(key.key)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 插件状态面板 */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    插件状态
                                </CardTitle>
                                <CardDescription>
                                    查看各个搜索插件的运行状态
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadPlugins}
                                disabled={isLoadingPlugins}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoadingPlugins ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingPlugins ? (
                            <div className="text-center py-8 text-gray-500">
                                加载中...
                            </div>
                        ) : plugins.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                暂无插件信息
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>插件名称</TableHead>
                                            <TableHead>状态</TableHead>
                                            <TableHead>描述</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {plugins.map((plugin) => (
                                            <TableRow key={plugin.name}>
                                                <TableCell className="font-medium">
                                                    {plugin.name}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`w-2 h-2 rounded-full ${plugin.status === 'active'
                                                                ? 'bg-green-500'
                                                                : plugin.status === 'error'
                                                                    ? 'bg-red-500'
                                                                    : 'bg-gray-400'
                                                                }`}
                                                        />
                                                        <span>
                                                            {plugin.status === 'active'
                                                                ? '活跃'
                                                                : plugin.status === 'error'
                                                                    ? '错误'
                                                                    : '不活跃'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-500">
                                                    {plugin.description || '无描述'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 创建 Key 对话框 */}
            <CreateKeyDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleCreateSuccess}
            />

            {/* 删除确认对话框 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            您确定要删除这个 API Key 吗？此操作无法撤销，使用该 Key 的用户将无法继续访问系统。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isDeleting ? '删除中...' : '确认删除'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Admin;
