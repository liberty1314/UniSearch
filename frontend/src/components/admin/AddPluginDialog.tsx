import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Zap, AlertCircle, CheckCircle2, Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AddPluginDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    token: string;
}

interface PluginFormData {
    name: string;
    url: string;
    priority: number;
    description: string;
}

export const AddPluginDialog: React.FC<AddPluginDialogProps> = ({
    isOpen,
    onClose,
    onSuccess,
    token,
}) => {
    const [formData, setFormData] = useState<PluginFormData>({
        name: '',
        url: '',
        priority: 100,
        description: '',
    });
    const [isTestingUrl, setIsTestingUrl] = useState(false);
    const [urlTestResult, setUrlTestResult] = useState<'success' | 'error' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * 测试插件URL连接
     */
    const handleTestUrl = async () => {
        if (!formData.url) {
            toast.error('请先输入插件URL');
            return;
        }

        setIsTestingUrl(true);
        setUrlTestResult(null);

        try {
            // 简单的URL格式验证
            const url = new URL(formData.url);
            
            // 尝试访问URL（使用HEAD请求减少数据传输）
            const response = await fetch(formData.url, {
                method: 'HEAD',
                mode: 'no-cors', // 允许跨域
            });

            setUrlTestResult('success');
            toast.success('URL连接测试成功！', {
                description: `可以访问 ${url.hostname}`,
            });
        } catch (error) {
            setUrlTestResult('error');
            toast.error('URL连接测试失败', {
                description: error instanceof Error ? error.message : '无法访问该URL',
            });
        } finally {
            setIsTestingUrl(false);
        }
    };

    /**
     * 提交新增/编辑插件
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 表单验证
        if (!formData.name || !formData.url) {
            toast.error('请填写必填字段');
            return;
        }

        setIsSubmitting(true);

        try {
            const url = editMode 
                ? `/api/admin/plugins/${formData.name}` 
                : '/api/admin/plugins';
            
            const method = editMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success(editMode ? '插件更新成功！' : '插件添加成功！', {
                    description: `插件 ${formData.name} 已成功${editMode ? '更新' : '添加'}`,
                });
                onSuccess();
                handleClose();
            } else {
                const error = await response.json();
                toast.error(editMode ? '插件更新失败' : '插件添加失败', {
                    description: error.message || '请检查插件配置',
                });
            }
        } catch (error) {
            console.error(editMode ? '更新插件失败:' : '添加插件失败:', error);
            toast.error(editMode ? '更新插件失败' : '添加插件失败', {
                description: '网络错误或服务器无响应',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * 关闭对话框并重置表单
     */
    const handleClose = () => {
        setFormData({
            name: '',
            url: '',
            priority: 100,
            description: '',
        });
        setUrlTestResult(null);
        onClose();
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
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 头部 */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                                        {editMode ? <Edit className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                            {editMode ? '编辑插件' : '新增插件'}
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {editMode ? '修改插件配置信息' : '添加新的搜索插件到系统'}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleClose}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                </motion.button>
                            </div>

                            {/* 表单内容 */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {/* 插件名称 */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        插件名称 <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="例如: duoduo, wanou"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full"
                                        required
                                        disabled={editMode}
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {editMode ? '插件名称不可修改' : '插件的唯一标识符，建议使用小写字母和数字'}
                                    </p>
                                </div>

                                {/* 插件URL */}
                                <div className="space-y-2">
                                    <Label htmlFor="url" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        插件URL <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="url"
                                            type="url"
                                            placeholder="https://example.com/api"
                                            value={formData.url}
                                            onChange={(e) => {
                                                setFormData({ ...formData, url: e.target.value });
                                                setUrlTestResult(null);
                                            }}
                                            className="flex-1"
                                            required
                                        />
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleTestUrl}
                                                disabled={isTestingUrl || !formData.url}
                                                className="px-4 cursor-pointer"
                                            >
                                                {isTestingUrl ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Zap className="w-4 h-4" />
                                                )}
                                                <span className="ml-2">测试</span>
                                            </Button>
                                        </motion.div>
                                    </div>
                                    {urlTestResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                                                urlTestResult === 'success'
                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                            }`}
                                        >
                                            {urlTestResult === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4" />
                                            )}
                                            <span>
                                                {urlTestResult === 'success'
                                                    ? 'URL连接测试成功'
                                                    : 'URL连接测试失败'}
                                            </span>
                                        </motion.div>
                                    )}
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        插件的API地址，点击"测试"按钮验证连接
                                    </p>
                                </div>

                                {/* 优先级 */}
                                <div className="space-y-2">
                                    <Label htmlFor="priority" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        优先级
                                    </Label>
                                    <Input
                                        id="priority"
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        数字越小优先级越高，建议范围: 1-1000
                                    </p>
                                </div>

                                {/* 描述 */}
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        描述
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder="插件的功能描述..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full min-h-[100px] resize-none"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        简要描述插件的功能和用途
                                    </p>
                                </div>
                            </form>

                            {/* 底部按钮 */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                        className="cursor-pointer"
                                    >
                                        取消
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        type="submit"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !formData.name || !formData.url}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                {editMode ? '更新中...' : '添加中...'}
                                            </>
                                        ) : (
                                            <>
                                                {editMode ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                                {editMode ? '更新插件' : '添加插件'}
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
