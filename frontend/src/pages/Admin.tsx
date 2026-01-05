import React, { useState, useEffect, useCallback } from 'react';
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
import { EditKeyDialog } from '@/components/admin/EditKeyDialog';
import { BatchExtendDialog } from '@/components/admin/BatchExtendDialog';
import { BatchCreateDialog } from '@/components/admin/BatchCreateDialog';
import { BatchDeleteDialog } from '@/components/admin/BatchDeleteDialog';
import { Sidebar, type AdminView } from '@/components/admin/Sidebar';
import { BatchActionsBar } from '@/components/admin/BatchActionsBar';
import { Plus, Trash2, Copy, RefreshCw, Key, Activity, Edit } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ApiKeyTableRow from '@/components/admin/ApiKeyTableRow';

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

    // 当前视图状态
    const [currentView, setCurrentView] = useState<AdminView>('api-keys');

    // 移动端侧边栏状态
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

    // API Keys 列表
    const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([]);
    const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(true);

    // 选中的 API Keys
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    // 插件状态列表
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [isLoadingPlugins, setIsLoadingPlugins] = useState<boolean>(true);

    // 创建 Key 对话框状态
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);

    // 编辑 Key 对话框状态
    const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
    const [keyToEdit, setKeyToEdit] = useState<APIKeyInfo | null>(null);

    // 批量延长对话框状态
    const [isBatchExtendDialogOpen, setIsBatchExtendDialogOpen] = useState<boolean>(false);

    // 批量创建对话框状态
    const [isBatchCreateDialogOpen, setIsBatchCreateDialogOpen] = useState<boolean>(false);

    // 批量删除对话框状态
    const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState<boolean>(false);

    // 删除确认对话框状态
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // 批量操作加载状态
    const [isBatchOperating, setIsBatchOperating] = useState<boolean>(false);

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
    const loadApiKeys = useCallback(async () => {
        setIsLoadingKeys(true);
        try {
            const keys = await AuthService.listApiKeys();
            setApiKeys(keys);
        } catch (error: unknown) {
            console.error('加载 API Keys 失败:', error);

            if (error && typeof error === 'object' && 'response' in error) {
                const err = error as { response?: { status?: number }; message?: string };
                if (err.response?.status === 401) {
                    toast.error('登录已过期，请重新登录');
                    logout();
                    navigate('/login');
                } else {
                    toast.error('加载 API Keys 失败：' + (err.message || '未知错误'));
                }
            } else {
                toast.error('加载 API Keys 失败：未知错误');
            }
        } finally {
            setIsLoadingKeys(false);
        }
    }, [logout, navigate]);

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
        } catch (error: unknown) {
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
    }, [isAdmin, loadApiKeys]);

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
        } catch (error: unknown) {
            console.error('删除 API Key 失败:', error);

            if (error && typeof error === 'object' && 'response' in error) {
                const err = error as { response?: { status?: number }; message?: string };
                if (err.response?.status === 401) {
                    toast.error('登录已过期，请重新登录');
                    logout();
                    navigate('/login');
                } else {
                    toast.error('删除失败：' + (err.message || '未知错误'));
                }
            } else {
                toast.error('删除失败：未知错误');
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
     * 判断 Key 是否已过期
     */
    const isKeyExpired = (expiresAt: string): boolean => {
        return new Date(expiresAt) < new Date();
    };

    /**
     * 处理全选/取消全选
     */
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            // 全选：选中所有未过期且启用的 API Keys
            const validKeys = apiKeys
                .filter(key => key.is_enabled && !isKeyExpired(key.expires_at))
                .map(key => key.key);
            setSelectedKeys(new Set(validKeys));
        } else {
            // 取消全选
            setSelectedKeys(new Set());
        }
    }, [apiKeys]);

    /**
     * 处理单个选择
     */
    const handleSelectKey = useCallback((key: string, checked: boolean) => {
        setSelectedKeys(prev => {
            const newSelected = new Set(prev);
            if (checked) {
                newSelected.add(key);
            } else {
                newSelected.delete(key);
            }
            return newSelected;
        });
    }, []);

    /**
     * 清除选择
     */
    const handleClearSelection = useCallback(() => {
        setSelectedKeys(new Set());
    }, []);

    /**
     * 处理批量延长（占位符）
     */
    const handleBatchExtend = () => {
        setIsBatchOperating(true);
        setIsBatchExtendDialogOpen(true);
    };

    /**
     * 处理批量延长成功
     */
    const handleBatchExtendSuccess = () => {
        // 刷新列表
        loadApiKeys();
        // 清除选择
        setSelectedKeys(new Set());
        // 重置批量操作状态
        setIsBatchOperating(false);
    };

    /**
     * 处理批量创建成功
     */
    const handleBatchCreateSuccess = () => {
        // 刷新列表
        loadApiKeys();
        // 重置批量操作状态
        setIsBatchOperating(false);
    };

    /**
     * 处理批量删除
     */
    const handleBatchDelete = () => {
        setIsBatchOperating(true);
        setIsBatchDeleteDialogOpen(true);
    };

    /**
     * 处理批量删除成功
     */
    const handleBatchDeleteSuccess = () => {
        // 刷新列表
        loadApiKeys();
        // 清除选择
        setSelectedKeys(new Set());
        // 重置批量操作状态
        setIsBatchOperating(false);
    };

    /**
     * 处理编辑按钮点击
     */
    const handleEditClick = (key: APIKeyInfo) => {
        setKeyToEdit(key);
        setIsEditDialogOpen(true);
    };

    /**
     * 处理编辑成功
     */
    const handleEditSuccess = () => {
        loadApiKeys();
    };

    /**
     * 判断是否全选
     */
    const isAllSelected = (): boolean => {
        const validKeys = apiKeys.filter(key => key.is_enabled && !isKeyExpired(key.expires_at));
        return validKeys.length > 0 && validKeys.every(key => selectedKeys.has(key.key));
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* 侧边栏 */}
            <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                isMobileOpen={isMobileSidebarOpen}
                onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />

            {/* 主内容区域 */}
            <div className="flex-1 overflow-auto">
                <div className="container mx-auto px-4 pt-6 pb-6 space-y-6 lg:pt-6">
                    {/* API Key 管理视图 */}
                    {currentView === 'api-keys' && (
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
                                            disabled={isLoadingKeys || isBatchOperating}
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsBatchOperating(true);
                                                setIsBatchCreateDialogOpen(true);
                                            }}
                                            className="flex items-center gap-2"
                                            disabled={isLoadingKeys || isBatchOperating}
                                        >
                                            <Plus className="w-4 h-4" />
                                            批量生成
                                        </Button>
                                        <Button
                                            onClick={() => setIsCreateDialogOpen(true)}
                                            className="flex items-center gap-2"
                                            disabled={isLoadingKeys || isBatchOperating}
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
                                    <div className="space-y-4">
                                        {/* 批量操作工具栏 */}
                                        <BatchActionsBar
                                            selectedCount={selectedKeys.size}
                                            onBatchExtend={handleBatchExtend}
                                            onBatchDelete={handleBatchDelete}
                                            onClearSelection={handleClearSelection}
                                            disabled={isLoadingKeys || isBatchOperating || isDeleting}
                                        />

                                        {/* API Keys 表格 */}
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-12">
                                                            <Checkbox
                                                                checked={isAllSelected()}
                                                                onCheckedChange={handleSelectAll}
                                                                aria-label="全选"
                                                                disabled={isLoadingKeys || isBatchOperating || isDeleting}
                                                            />
                                                        </TableHead>
                                                        <TableHead>API Key</TableHead>
                                                        <TableHead>描述</TableHead>
                                                        <TableHead>创建时间</TableHead>
                                                        <TableHead>过期时间</TableHead>
                                                        <TableHead>剩余时间</TableHead>
                                                        <TableHead>状态</TableHead>
                                                        <TableHead className="text-right">操作</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {apiKeys.map((key) => {
                                                        const expired = isKeyExpired(key.expires_at);
                                                        const canSelect = key.is_enabled && !expired;
                                                        const isSelected = selectedKeys.has(key.key);

                                                        return (
                                                            <ApiKeyTableRow
                                                                key={key.key}
                                                                apiKey={key}
                                                                isSelected={isSelected}
                                                                canSelect={canSelect}
                                                                isDeleting={isDeleting}
                                                                isBatchOperating={isBatchOperating}
                                                                onSelectChange={handleSelectKey}
                                                                onCopyKey={handleCopyKey}
                                                                onEditClick={handleEditClick}
                                                                onDeleteClick={handleDeleteClick}
                                                            />
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* 插件状态视图 */}
                    {currentView === 'plugins' && (
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
                    )}
                </div>
            </div>

            {/* 创建 Key 对话框 */}
            <CreateKeyDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleCreateSuccess}
            />

            {/* 编辑 Key 对话框 */}
            {keyToEdit && (
                <EditKeyDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    apiKey={keyToEdit}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* 批量延长对话框 */}
            <BatchExtendDialog
                open={isBatchExtendDialogOpen}
                onOpenChange={(open) => {
                    setIsBatchExtendDialogOpen(open);
                    if (!open) {
                        setIsBatchOperating(false);
                    }
                }}
                selectedKeys={Array.from(selectedKeys)}
                onSuccess={handleBatchExtendSuccess}
            />

            {/* 批量创建对话框 */}
            <BatchCreateDialog
                open={isBatchCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsBatchCreateDialogOpen(open);
                    if (!open) {
                        setIsBatchOperating(false);
                    }
                }}
                onSuccess={handleBatchCreateSuccess}
            />

            {/* 批量删除对话框 */}
            <BatchDeleteDialog
                open={isBatchDeleteDialogOpen}
                onOpenChange={(open) => {
                    setIsBatchDeleteDialogOpen(open);
                    if (!open) {
                        setIsBatchOperating(false);
                    }
                }}
                selectedKeys={Array.from(selectedKeys)}
                onSuccess={handleBatchDeleteSuccess}
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
