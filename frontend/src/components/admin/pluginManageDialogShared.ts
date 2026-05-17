import type { PluginInfo } from '@/types/api';

export type TestStatus = 'idle' | 'testing' | 'success' | 'error';
export type URLTestStatus = 'idle' | 'success' | 'error';

export type AddPluginForm = {
  name: string;
  url: string;
  priority: number;
  description: string;
  version: string;
  category: string;
  capabilitiesText: string;
  tags: string[];
};

export type EditPluginForm = {
  priority: number;
  description: string;
  url: string;
  version: string;
  category: string;
  capabilitiesText: string;
  tags: string[];
};

export const PAGE_SIZE = 10;

export const resolvePluginStatus = (plugin: PluginInfo): PluginInfo['status'] => {
  if (plugin.status === 'error') return 'error';
  if (!plugin.is_enabled) return 'inactive';
  return plugin.plugin_type === 'custom' ? 'custom' : 'active';
};

export const pluginStatusText = (status: PluginInfo['status']): string => {
  if (status === 'custom') return '自定义';
  if (status === 'active') return '内置';
  if (status === 'error') return '异常';
  return '已停用';
};

export const pluginStatusBadgeClass = (status: PluginInfo['status']): string => {
  if (status === 'custom') return 'bg-blue-100 text-blue-700 dark:bg-cyan-950/40 dark:text-cyan-300';
  if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  if (status === 'error') return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export const createEmptyAddPluginForm = (): AddPluginForm => ({
  name: '',
  url: '',
  priority: 3,
  description: '',
  version: '0.0.0',
  category: 'search',
  capabilitiesText: 'resource.search',
  tags: [],
});

export const parseCapabilitiesInput = (value: string): string[] =>
  value
    .split(/[\s,，]+/)
    .map((capability) => capability.trim())
    .filter(Boolean);

export const formatCapabilitiesInput = (capabilities?: string[]): string =>
  capabilities?.length ? capabilities.join(', ') : 'resource.search';
