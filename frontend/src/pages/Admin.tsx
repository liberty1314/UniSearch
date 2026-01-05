import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import type { APIKeyInfo } from '@/types/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
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
import { StatsCard } from '@/components/admin/StatsCard';
import { SystemInfoView } from '@/components/admin/SystemInfoView';
import { Plus, RefreshCw, Key, AlertCircle, CheckCircle2, Activity } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ApiKeyTableRow from '@/components/admin/ApiKeyTableRow';

/**
 * 后台管理页面组件
 * 
 * 提供以下功能：
 * 1. API Key 管理（列表、创建、删除）
 * 2. 系统监控（插件状态、系统配置）
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
     * 初始加载数据
     */
    useEffect(() => {
        if (isAdmin) {
            loadApiKeys();
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
     * 处理批量延长
     */
    const handleBatchExtend = () => {
        setIsBatchOperating(true);
        setIsBatchExtendDialogOpen(true);
    };

    /**
     * 处理批量延长成功
     */
    const handleBatchExtendSuccess = () => {
        loadApiKeys();
        setSelectedKeys(new Set());
        setIsBatchOperating(false);
    };

    /**
     * 处理批量创建成功
     */
    const handleBatchCreateSuccess = () => {
        loadApiKeys();
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
        loadApiKeys();
        setSelectedKeys(new Set());
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
        <div className="fixed inset-0 top-16 flex w-full bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20">
            {/* 侧边栏占位容器 - 桌面端 */}
            <div className="hidden lg:block flex-shrink-0 w-[288px]" />

            {/* 侧边栏 */}
            <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                isMobileOpen={isMobileSidebarOpen}
                onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />

            {/* 主内容区域 */}
            <div className="flex-1 h-full overflow-y-auto">
                <div className="container mx-auto px-4 py-6 space-y-6 lg:px-8 lg:py-8">
                    {/* API Key 管理视图 */}
                    {currentView === 'api-keys' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* 统计卡片 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatsCard
                                    title="总密钥数"
                                    value={apiKeys.length}
                                    icon={Key}
                                    color="blue"
                                    index={0}
                                />
                                <StatsCard
                                    title="活跃密钥"
                                    value={apiKeys.filter(k => k.is_enabled && !isKeyExpired(k.expires_at)).length}
                                    icon={CheckCircle2}
                                    color="emerald"
                                    index={1}
                                />
                                <StatsCard
                                    title="即将过期"
                                    value={apiKeys.filter(k => {
                                        const daysLeft = Math.floor((new Date(k.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                        return daysLeft >= 0 && daysLeft <= 7;
                                    }).length}
                                    icon={AlertCircle}
                                    color="amber"
                                    index={2}
                                />
                                <StatsCard
                                    title="已过期"
                                    value={apiKeys.filter(k => isKeyExpired(k.expires_at)).length}
                                    icon={Activity}
                                    color="purple"
                                    index={3}
                                />
                            </div>

                            {/* API Key 管理卡片 */}
                            <Card className="border-gray-100 dark:border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                                <CardHeader className="border-b border-gray-100 dark:border-gray-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                                                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                API Key 管理
                                            </CardTitle>
                                            <CardDescription className="text-slate-500 dark:text-slate-400">
                                                管理系统的 API Keys，控制用户访问权限
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={loadApiKeys}
                                                    disabled={isLoadingKeys || isBatchOperating}
                                                    className="border-slate-200 dark:border-slate-700"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </motion.div>
                                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsBatchOperating(true);
                                                        setIsBatchCreateDialogOpen(true);
                                                    }}
                                                    className="flex items-center gap-2 border-slate-200 dark:border-slate-700"
                                                    disabled={isLoadingKeys || isBatchOperating}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    批量生成
                                                </Button>
                                            </motion.div>
                                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                <Button
                                                    onClick={() => setIsCreateDialogOpen(true)}
                                                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
                                                    disabled={isLoadingKeys || isBatchOperating}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    生成新 Key
                                                </Button>
                                            </motion.div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {isLoadingKeys ? (
                                        <div className="text-center py-12">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="inline-block"
                                            >
                                                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                            </motion.div>
                                            <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
                                        </div>
                                    ) : apiKeys.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-12"
                                        >
                                            <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                                <Key className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 mb-4">
                                                暂无 API Keys
                                            </p>
                                            <Button
                                                onClick={() => setIsCreateDialogOpen(true)}
                                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                创建第一个 Key
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* 批量操作工具栏 */}
                                            <AnimatePresence>
                                                {selectedKeys.size > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                    >
                                                        <BatchActionsBar
                                                            selectedCount={selectedKeys.size}
                                                            onBatchExtend={handleBatchExtend}
                                                            onBatchDelete={handleBatchDelete}
                                                            onClearSelection={handleClearSelection}
                                                            disabled={isLoadingKeys || isBatchOperating || isDeleting}
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* API Keys 表格 */}
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <TableHead className="w-12">
                                                                <Checkbox
                                                                    checked={isAllSelected()}
                                                                    onCheckedChange={handleSelectAll}
                                                                    aria-label="全选"
                                                                    disabled={isLoadingKeys || isBatchOperating || isDeleting}
                                                                />
                                                            </TableHead>
                                                            <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">API Key</TableHead>
                                                            <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">描述</TableHead>
                                                            <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">创建时间</TableHead>
                                                            <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">过期时间</TableHead>
                                                            <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">剩余时间</TableHead>
                                                            <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">状态</TableHead>
                                                            <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 text-right">操作</TableHead>
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
                        </motion.div>
                    )}

                    {/* 系统监控视图 */}
                    {currentView === 'system-info' && <SystemInfoView />}
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
