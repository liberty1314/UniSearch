import React from 'react';
import { Key, Activity, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 管理视图类型
 */
export type AdminView = 'api-keys' | 'plugins';

/**
 * 导航项配置
 */
interface NavItem {
    id: AdminView;
    label: string;
    icon: React.ReactNode;
}

/**
 * Sidebar 组件属性
 */
interface SidebarProps {
    /** 当前选中的视图 */
    currentView: AdminView;
    /** 视图切换回调 */
    onViewChange: (view: AdminView) => void;
    /** 移动端是否打开 */
    isMobileOpen?: boolean;
    /** 移动端切换回调 */
    onMobileToggle?: () => void;
}

/**
 * 侧边栏导航组件
 * 
 * 功能：
 * - 显示导航项列表
 * - 高亮当前选中项
 * - 移动端支持折叠/展开
 * - 响应式设计
 */
export const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    onViewChange,
    isMobileOpen = false,
    onMobileToggle,
}) => {
    /**
     * 导航项配置
     */
    const navItems: NavItem[] = [
        {
            id: 'api-keys',
            label: 'API Key 管理',
            icon: <Key className="w-5 h-5" />,
        },
        {
            id: 'plugins',
            label: '插件状态',
            icon: <Activity className="w-5 h-5" />,
        },
    ];

    /**
     * 处理导航项点击
     */
    const handleNavClick = (view: AdminView) => {
        onViewChange(view);
        // 移动端点击后自动关闭侧边栏
        if (onMobileToggle && isMobileOpen) {
            onMobileToggle();
        }
    };

    return (
        <>
            {/* 移动端遮罩层 */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onMobileToggle}
                />
            )}

            {/* 侧边栏 */}
            <aside
                className={`
                    fixed lg:sticky top-0 left-0 h-screen
                    w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
                    transition-transform duration-300 ease-in-out z-50
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* 侧边栏头部 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        管理后台
                    </h2>
                    {/* 移动端关闭按钮 */}
                    {onMobileToggle && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onMobileToggle}
                            className="lg:hidden"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                {/* 导航列表 */}
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                                    transition-colors duration-200
                                    ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }
                                `}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* 移动端菜单按钮 */}
            {onMobileToggle && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onMobileToggle}
                    className="fixed top-4 left-4 z-30 lg:hidden"
                >
                    <Menu className="w-5 h-5" />
                </Button>
            )}
        </>
    );
};
