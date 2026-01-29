import React from 'react';
import { AppleTable, AppleTableColumn } from '@/components/AppleTable';
import { Badge } from '@/components/ui/badge';

interface PluginInfo {
  name: string;
  priority: number;
  status: string;
  description: string;
}

interface ApplePluginTableProps {
  plugins: PluginInfo[];
  isLoading: boolean;
}

/**
 * Apple 风格插件表格组件
 */
export const ApplePluginTable: React.FC<ApplePluginTableProps> = ({
  plugins,
  isLoading,
}) => {
  /**
   * 列配置
   */
  const columns: AppleTableColumn<PluginInfo>[] = [
    {
      key: 'name',
      title: '插件名称',
      sortable: true,
      render: (plugin) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {plugin.name}
        </span>
      ),
    },
    {
      key: 'priority',
      title: '优先级',
      sortable: true,
      align: 'center',
      hideOnMobile: true,
      render: (plugin) => (
        <Badge variant="outline" className="font-mono">
          {plugin.priority}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (plugin) => {
        const statusConfig =
          plugin.status === 'active'
            ? {
                text: '活跃',
                color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                dotColor: 'bg-green-500',
              }
            : plugin.status === 'inactive'
            ? {
                text: '不活跃',
                color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                dotColor: 'bg-gray-400',
              }
            : {
                text: '错误',
                color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                dotColor: 'bg-red-500',
              };

        return (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
            {statusConfig.text}
          </div>
        );
      },
    },
    {
      key: 'description',
      title: '描述',
      render: (plugin) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {plugin.description}
        </span>
      ),
    },
  ];

  // 按优先级排序
  const sortedPlugins = [...plugins].sort((a, b) => a.priority - b.priority);

  return (
    <AppleTable
      data={sortedPlugins}
      columns={columns}
      rowKey={(plugin) => plugin.name}
      loading={isLoading}
      emptyText="暂无插件数据"
      hoverable
    />
  );
};
