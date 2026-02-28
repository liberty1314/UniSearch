import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Zap, Trash2, Loader2, CheckCircle2, XCircle, AlertCircle, Eye, Edit3, Save, ChevronUp, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PluginInfo {
    name: string;
    priority: number;
    status: string;
    description: string;
    url?: string;
}

interface PluginManageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    token: string;
    plugins: PluginInfo[];
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const PluginManageDialog: React.FC<PluginManageDialogProps> = ({
    isOpen,
    onClose,
    onSuccess,
    token,
    plugins,
}) => {
    const [testingStatus, setTestingStatus] = useState<Record<string, TestStatus>>({});
    const [localPlugins, setLocalPlugins] = useState<PluginInfo[]>(plugins);

    // 同步 props 到本地状态
    useEffect(() => {
        setLocalPlugins(plugins);
    }, [plugins]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPlugin, setNewPlugin] = useState({ name: '', url: '', priority: 100, description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUrlTestStatus, setNewUrlTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
    const [editingPlugin, setEditingPlugin] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ priority: number; description: string; url: string }>({ priority: 0, description: '', url: '' });
    const [isBatchTesting, setIsBatchTesting] = useState(false);

    // 测试插件连通性
    const handleTestPlugin = async (pluginName: string) => {
        setTestingStatus(prev => ({ ...prev, [pluginName]: 'testing' }));

        try {
            const response = await fetch(`/api/admin/plugins/${pluginName}/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setTestingStatus(prev => ({ ...prev, [pluginName]: 'success' }));
                setLocalPlugins(prev => prev.map(p =>
                    p.name === pluginName ? { ...p, status: p.url ? 'custom' : 'active' } : p
                ));
                toast.success(`插件 ${pluginName} 连通性测试成功`);
            } else {
                setTestingStatus(prev => ({ ...prev, [pluginName]: 'error' }));
                setLocalPlugins(prev => prev.map(p =>
                    p.name === pluginName ? { ...p, status: 'error' } : p
                ));
                toast.error(`插件 ${pluginName} 连通性测试失败`);
            }
        } catch {
            setTestingStatus(prev => ({ ...prev, [pluginName]: 'error' }));
            toast.error(`插件 ${pluginName} 测试出错`);
        }

        // 5秒后重置状态
        setTimeout(() => {
            setTestingStatus(prev => ({ ...prev, [pluginName]: 'idle' }));
        }, 5000);
    };

    // 批量测试所有活跃/自定义/测试失败的插件
    const handleBatchTest = async () => {
        const activePlugins = localPlugins.filter(p => p.status === 'active' || p.status === 'custom' || p.status === 'error');
        if (activePlugins.length === 0) {
            toast.error('没有可供测试的插件');
            return;
        }

        setIsBatchTesting(true);
        const testingMap: Record<string, TestStatus> = {};
        activePlugins.forEach(p => { testingMap[p.name] = 'testing'; });
        setTestingStatus(prev => ({ ...prev, ...testingMap }));

        const results = await Promise.allSettled(
            activePlugins.map(async (plugin) => {
                try {
                    const response = await fetch(`/api/admin/plugins/${plugin.name}/test`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    const ok = response.ok;
                    setTestingStatus(prev => ({
                        ...prev,
                        [plugin.name]: ok ? 'success' : 'error',
                    }));

                    // 更新插件状态
                    setLocalPlugins(prev => prev.map(p => {
                        if (p.name === plugin.name) {
                            return { ...p, status: ok ? (p.url ? 'custom' : 'active') : 'error' };
                        }
                        return p;
                    }));

                    return { name: plugin.name, ok };
                } catch {
                    setTestingStatus(prev => ({ ...prev, [plugin.name]: 'error' }));
                    setLocalPlugins(prev => prev.map(p =>
                        p.name === plugin.name ? { ...p, status: 'error' } : p
                    ));
                    return { name: plugin.name, ok: false };
                }
            })
        );

        const successCount = results.filter(
            r => r.status === 'fulfilled' && r.value.ok
        ).length;
        const failCount = activePlugins.length - successCount;

        if (failCount === 0) {
            toast.success(`全部 ${successCount} 个插件测试通过`);
        } else {
            toast.warning(`${successCount} 个通过，${failCount} 个失败`);
        }

        setIsBatchTesting(false);

        setTimeout(() => {
            setTestingStatus({});
        }, 10000);
    };

    // 删除插件
    const handleDeletePlugin = async (pluginName: string) => {
        if (!confirm(`确定要删除插件 "${pluginName}" 吗？`)) return;

        try {
            const response = await fetch(`/api/admin/plugins/${pluginName}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                toast.success(`插件 ${pluginName} 已删除`);
                onSuccess();
            } else {
                toast.error(`删除插件失败`);
            }
        } catch {
            toast.error('删除插件出错');
        }
    };

    // 展开/收起插件详情
    const toggleExpand = (pluginName: string) => {
        if (expandedPlugin === pluginName) {
            setExpandedPlugin(null);
            setEditingPlugin(null);
        } else {
            setExpandedPlugin(pluginName);
            setEditingPlugin(null);
        }
    };

    // 开始编辑插件
    const startEditing = (plugin: PluginInfo) => {
        setEditingPlugin(plugin.name);
        setEditForm({
            priority: plugin.priority,
            description: plugin.description,
            url: plugin.url || '',
        });
    };

    // 保存编辑
    const handleSaveEdit = async (pluginName: string) => {
        try {
            const response = await fetch(`/api/admin/plugins/${pluginName}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editForm),
            });

            if (response.ok) {
                toast.success('插件更新成功');
                setEditingPlugin(null);
                onSuccess();
            } else {
                toast.error('更新插件失败');
            }
        } catch {
            toast.error('更新插件出错');
        }
    };

    // 新增插件
    const handleAddPlugin = async () => {
        if (!newPlugin.name || !newPlugin.url) {
            toast.error('请填写插件名称和URL');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/admin/plugins', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPlugin),
            });

            if (response.ok) {
                toast.success('插件添加成功');
                setNewPlugin({ name: '', url: '', priority: 100, description: '' });
                setShowAddForm(false);
                onSuccess();
            } else {
                toast.error('添加插件失败');
            }
        } catch {
            toast.error('添加插件出错');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 测试新插件URL连通性
    const handleTestNewUrl = async () => {
        if (!newPlugin.url) {
            toast.error('请先输入URL');
            return;
        }

        setNewUrlTestStatus('testing');

        try {
            const response = await fetch('/api/admin/test-url', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: newPlugin.url }),
            });

            const result = await response.json();

            if (result.success) {
                setNewUrlTestStatus('success');
                toast.success('URL连通性测试成功', {
                    description: `状态码: ${result.status_code}`,
                });
            } else {
                setNewUrlTestStatus('error');
                toast.error('URL连通性测试失败', {
                    description: result.message || '无法连接',
                });
            }
        } catch {
            setNewUrlTestStatus('error');
            toast.error('测试请求失败', {
                description: '网络错误或服务器无响应',
            });
        }

        // 5秒后重置状态
        setTimeout(() => {
            setNewUrlTestStatus('idle');
        }, 5000);
    };

    const handleClose = () => {
        setShowAddForm(false);
        setNewPlugin({ name: '', url: '', priority: 100, description: '' });
        onClose();
    };

    // 获取测试状态图标
    const getTestIcon = (status: TestStatus) => {
        switch (status) {
            case 'testing':
                return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'success':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Zap className="w-4 h-4" />;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* 对话框 */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 头部 */}
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                        插件管理
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        管理系统插件：测试连通性、新增或删除
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center cursor-pointer"
                                >
                                    <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                </motion.button>
                            </div>

                            {/* 内容区域 */}
                            <div className="flex-1 overflow-y-auto p-5">
                                {/* 新增插件按钮 */}
                                {!showAddForm && (
                                    <motion.div whileHover={{ scale: 1.02 }} className="mb-4">
                                        <Button
                                            onClick={() => setShowAddForm(true)}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            新增插件
                                        </Button>
                                    </motion.div>
                                )}

                                {/* 新增插件表单 */}
                                <AnimatePresence>
                                    {showAddForm && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                                        >
                                            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">新增插件</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">插件名称 *</Label>
                                                    <Input
                                                        placeholder="例如: myplugin"
                                                        value={newPlugin.name}
                                                        onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">优先级</Label>
                                                    <Input
                                                        type="number"
                                                        value={newPlugin.priority}
                                                        onChange={(e) => setNewPlugin({ ...newPlugin, priority: parseInt(e.target.value) || 100 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">插件URL *</Label>
                                                    <div className="flex gap-2 mt-1">
                                                        <Input
                                                            placeholder="https://example.com/api"
                                                            value={newPlugin.url}
                                                            onChange={(e) => setNewPlugin({ ...newPlugin, url: e.target.value })}
                                                            className="flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleTestNewUrl}
                                                            disabled={newUrlTestStatus === 'testing'}
                                                            className={`cursor-pointer ${newUrlTestStatus === 'success' ? 'border-green-500 text-green-600' :
                                                                newUrlTestStatus === 'error' ? 'border-red-500 text-red-600' : ''
                                                                }`}
                                                        >
                                                            {newUrlTestStatus === 'testing' ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : newUrlTestStatus === 'success' ? (
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            ) : newUrlTestStatus === 'error' ? (
                                                                <XCircle className="w-4 h-4" />
                                                            ) : (
                                                                <Zap className="w-4 h-4" />
                                                            )}
                                                            <span className="ml-1">
                                                                {newUrlTestStatus === 'testing' ? '测试中' :
                                                                    newUrlTestStatus === 'success' ? '成功' :
                                                                        newUrlTestStatus === 'error' ? '失败' : '测试'}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">描述</Label>
                                                    <Input
                                                        placeholder="插件功能描述"
                                                        value={newPlugin.description}
                                                        onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setShowAddForm(false);
                                                        setNewPlugin({ name: '', url: '', priority: 100, description: '' });
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    取消
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleAddPlugin}
                                                    disabled={isSubmitting}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                                                    添加
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* 插件列表 */}
                                <div className="space-y-2">
                                    {localPlugins.map((plugin) => (
                                        <motion.div
                                            key={plugin.name}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-colors overflow-hidden"
                                        >
                                            {/* 插件主行 */}
                                            <div className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${plugin.status === 'active' ? 'bg-green-500' :
                                                        plugin.status === 'custom' ? 'bg-blue-500' :
                                                            plugin.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                                                        }`} />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-slate-700 dark:text-slate-200 truncate">{plugin.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{plugin.description}</div>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs flex-shrink-0">优先级: {plugin.priority}</Badge>
                                                    {plugin.status === 'custom' && (
                                                        <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex-shrink-0">自定义</Badge>
                                                    )}
                                                    {plugin.status === 'active' && (
                                                        <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex-shrink-0">内置</Badge>
                                                    )}
                                                    {plugin.status === 'error' && (
                                                        <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 flex-shrink-0">异常</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 ml-2">
                                                    {/* 查看/收起按钮 */}
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleExpand(plugin.name)}
                                                            className="h-8 px-2 text-xs cursor-pointer"
                                                        >
                                                            {expandedPlugin === plugin.name ? (
                                                                <ChevronUp className="w-4 h-4" />
                                                            ) : (
                                                                <Eye className="w-4 h-4" />
                                                            )}
                                                            <span className="ml-1">{expandedPlugin === plugin.name ? '收起' : '查看'}</span>
                                                        </Button>
                                                    </motion.div>
                                                    {/* 测试按钮 */}
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleTestPlugin(plugin.name)}
                                                            disabled={testingStatus[plugin.name] === 'testing'}
                                                            className="h-8 px-2 text-xs cursor-pointer"
                                                        >
                                                            {getTestIcon(testingStatus[plugin.name] || 'idle')}
                                                            <span className="ml-1">测试</span>
                                                        </Button>
                                                    </motion.div>
                                                    {/* 删除按钮 - 只有自定义插件可删除 */}
                                                    {plugin.status === 'custom' && (
                                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeletePlugin(plugin.name)}
                                                                className="h-8 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 cursor-pointer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 展开的详情区域 */}
                                            <AnimatePresence>
                                                {expandedPlugin === plugin.name && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="border-t border-slate-200 dark:border-slate-600"
                                                    >
                                                        <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50">
                                                            {editingPlugin === plugin.name ? (
                                                                /* 编辑模式 */
                                                                <div className="space-y-3">
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                            <Label className="text-xs text-slate-600 dark:text-slate-400">插件名称</Label>
                                                                            <Input
                                                                                value={plugin.name}
                                                                                disabled
                                                                                className="mt-1 bg-slate-200 dark:bg-slate-700"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-xs text-slate-600 dark:text-slate-400">优先级</Label>
                                                                            <Input
                                                                                type="number"
                                                                                value={editForm.priority}
                                                                                onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) || 0 })}
                                                                                className="mt-1"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    {plugin.status === 'custom' && (
                                                                        <div>
                                                                            <Label className="text-xs text-slate-600 dark:text-slate-400">URL</Label>
                                                                            <Input
                                                                                value={editForm.url}
                                                                                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                                                                className="mt-1"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <Label className="text-xs text-slate-600 dark:text-slate-400">描述</Label>
                                                                        <Input
                                                                            value={editForm.description}
                                                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                                            className="mt-1"
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-end gap-2 pt-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => setEditingPlugin(null)}
                                                                            className="cursor-pointer"
                                                                        >
                                                                            取消
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleSaveEdit(plugin.name)}
                                                                            className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                                                        >
                                                                            <Save className="w-4 h-4 mr-1" />
                                                                            保存
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* 查看模式 */
                                                                <div className="space-y-3">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">插件名称</span>
                                                                            <p className="font-medium text-slate-700 dark:text-slate-200">{plugin.name}</p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">优先级</span>
                                                                            <p className="font-medium text-slate-700 dark:text-slate-200">{plugin.priority}</p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">状态</span>
                                                                            <p className="font-medium text-slate-700 dark:text-slate-200">
                                                                                {plugin.status === 'active' ? '内置插件' :
                                                                                    plugin.status === 'custom' ? '自定义插件' :
                                                                                        plugin.status === 'error' ? '测试失败' : plugin.status}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">描述</span>
                                                                            <p className="font-medium text-slate-700 dark:text-slate-200">{plugin.description || '无描述'}</p>
                                                                        </div>
                                                                    </div>
                                                                    {plugin.status === 'custom' && plugin.url && (
                                                                        <div>
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">URL</span>
                                                                            <p className="font-medium text-slate-700 dark:text-slate-200 break-all">{plugin.url}</p>
                                                                        </div>
                                                                    )}
                                                                    {/* 只有自定义插件可编辑 */}
                                                                    {plugin.status === 'custom' && (
                                                                        <div className="flex justify-end pt-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => startEditing(plugin)}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                <Edit3 className="w-4 h-4 mr-1" />
                                                                                编辑
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </div>

                                {plugins.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>暂无插件</p>
                                    </div>
                                )}
                            </div>

                            {/* 底部 */}
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        共 {plugins.length} 个插件
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleBatchTest}
                                            disabled={isBatchTesting || plugins.length === 0}
                                            className="cursor-pointer text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                        >
                                            {isBatchTesting ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                            ) : (
                                                <PlayCircle className="w-4 h-4 mr-1" />
                                            )}
                                            批量测试
                                        </Button>
                                        <Button variant="outline" onClick={handleClose} className="cursor-pointer">
                                            关闭
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
