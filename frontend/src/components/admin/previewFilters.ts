import type { PluginInfo, TGChannel } from '@/types/api';

export type UnifiedStatusFilter = 'all' | 'enabled' | 'disabled' | 'error';

export const UNIFIED_STATUS_FILTER_OPTIONS: Array<{ value: UnifiedStatusFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
  { value: 'error', label: '异常' },
];

export const isPluginMatchesStatusFilter = (plugin: PluginInfo, filter: UnifiedStatusFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'enabled') return plugin.is_enabled;
  if (filter === 'disabled') return !plugin.is_enabled;
  return plugin.status === 'error';
};

export const isChannelMatchesStatusFilter = (channel: TGChannel, filter: UnifiedStatusFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'enabled') return channel.is_enabled;
  if (filter === 'disabled') return !channel.is_enabled;
  return (channel.health_status || 'untested') === 'error';
};
