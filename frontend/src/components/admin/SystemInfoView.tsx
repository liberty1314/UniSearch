import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsCard } from './StatsCard';
import {
    Activity,
    RefreshCw,
    Server,
    Database,
    Zap,
    Globe,
    CheckCircle2,
    Layers,
    Radio
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type { SystemInfoResponse } from '@/types/api';
import { toast } from 'sonner';

/**
 * 系统监控视图组件
 * 
 * 功能：
 * - 显示系统统计信息（插件数、频道数、缓存状态等）
 * - 显示插件详细列表（名称、优先级、状态、描述）
 * - 显示系统配置信息（缓存、并发、代理等）
 */
export const SystemInfoView: React.FC = () => {
    const { token } = useAuthStore();
    const [systemInfo, setSystemInfo] = useState<SystemInfoResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    /**
     * 加载系统信息
     */
    const loadSystemInfo = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/system-info', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSystemInfo(data);
            } else {
                throw new Error('获取系统信息失败');
            }
        } catch (error: unknown) {
            console.error('加载系统信息失败:', error);
            toast.error('加载系统信息失败');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 初始加载
     */
    useEffect(() => {
        loadSystemInfo();
    }, []);

    /**
     * 格式化代理 URL（隐藏敏感信息）
     */
    const formatProxyUrl = (url: string): string => {
        if (!url) return '未配置';
        // 隐藏密码部分
        return url.replace(/(:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
    };

    if (isLoading) {
        return (
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
        );
    }

    if (!systemInfo) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">暂无系统信息</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="插件总数"
                    value={systemInfo.stats.plugin_count}
                    icon={Layers}
                    color="blue"
                    index={0}
                />
                <StatsCard
                    title="活跃插件"
                    value={systemInfo.stats.active_plugin_count}
                    icon={CheckCircle2}
                    color="emerald"
                    index={1}
                />
                <StatsCard
                    title="频道数量"
                    value={systemInfo.stats.channel_count}
                    icon={Radio}
                    color="purple"
                    index={2}
                />
                <StatsCard
                    title="缓存状态"
                    value={systemInfo.stats.cache_enabled ? '已启用' : '已禁用'}
                    icon={Database}
                    color={systemInfo.stats.cache_enabled ? 'emerald' : 'amber'}
                    index={3}
                />
            </div>

            {/* 插件列表 */}
            <Card className="border-gray-100 dark:border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                插件状态
                            </CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400">
                                查看所有已注册插件的详细信息
                            </CardDescription>
                        </div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadSystemInfo}
                                disabled={isLoading}
                                className="border-slate-200 dark:border-slate-700"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        </motion.div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">插件名称</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">优先级</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">状态</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">描述</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {systemInfo.plugins
                                    .sort((a, b) => a.priority - b.priority)
                                    .map((plugin) => (
                                        <TableRow
                                            key={plugin.name}
                                            className="transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                                        >
                                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                                {plugin.name}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">
                                                <Badge variant="outline" className="font-mono">
                                                    {plugin.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={plugin.status === 'active' ? 'success' : 'outline'}
                                                    className="font-medium"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${plugin.status === 'active'
                                                                ? 'bg-green-500'
                                                                : 'bg-gray-400'
                                                            }`} />
                                                        {plugin.status === 'active' ? '活跃' : '不活跃'}
                                                    </div>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">
                                                {plugin.description}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* 系统配置 */}
            <Card className="border-gray-100 dark:border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                        <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        系统配置
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        查看当前系统的运行配置参数
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 缓存配置 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                缓存配置
                            </div>
                            <div className="space-y-2 pl-6 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">缓存路径:</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-mono text-xs">
                                        {systemInfo.config.cache_path}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">最大大小:</span>
                                    <span className="text-slate-700 dark:text-slate-300">
                                        {systemInfo.config.cache_max_size_mb} MB
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">TTL:</span>
                                    <span className="text-slate-700 dark:text-slate-300">
                                        {systemInfo.config.cache_ttl_minutes} 分钟
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 并发配置 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                并发配置
                            </div>
                            <div className="space-y-2 pl-6 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">默认并发数:</span>
                                    <span className="text-slate-700 dark:text-slate-300">
                                        {systemInfo.config.default_concurrency}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">最大连接数:</span>
                                    <span className="text-slate-700 dark:text-slate-300">
                                        {systemInfo.config.http_max_conns}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 代理配置 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                代理配置
                            </div>
                            <div className="space-y-2 pl-6 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">代理状态:</span>
                                    <Badge variant={systemInfo.stats.proxy_enabled ? 'success' : 'outline'}>
                                        {systemInfo.stats.proxy_enabled ? '已启用' : '未启用'}
                                    </Badge>
                                </div>
                                {systemInfo.stats.proxy_enabled && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">代理地址:</span>
                                        <span className="text-slate-700 dark:text-slate-300 font-mono text-xs">
                                            {formatProxyUrl(systemInfo.config.proxy_url)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 异步插件配置 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                异步插件配置
                            </div>
                            <div className="space-y-2 pl-6 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">异步插件:</span>
                                    <Badge variant={systemInfo.config.async_plugin_enabled ? 'success' : 'outline'}>
                                        {systemInfo.config.async_plugin_enabled ? '已启用' : '未启用'}
                                    </Badge>
                                </div>
                                {systemInfo.config.async_plugin_enabled && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">响应超时:</span>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {systemInfo.config.async_response_timeout} 秒
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">最大工作者:</span>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {systemInfo.config.async_max_background_workers}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">最大任务:</span>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {systemInfo.config.async_max_background_tasks}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 频道列表 */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Telegram 频道列表 ({systemInfo.config.channels.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {systemInfo.config.channels.map((channel) => (
                                <Badge
                                    key={channel}
                                    variant="outline"
                                    className="font-mono text-xs"
                                >
                                    {channel}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};
