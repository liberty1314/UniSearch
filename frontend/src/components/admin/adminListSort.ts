import type { PluginInfo } from "@/types/plugin";
import type { TGChannel } from "@/types/channel";

export const getEffectivePluginStatus = (plugin: PluginInfo): PluginInfo['status'] => {
  if (!plugin.is_enabled) return 'inactive';
  if (plugin.status === 'error') return 'error';
  return plugin.plugin_type === 'custom' ? 'custom' : 'active';
};

export const getPluginSortRank = (plugin: PluginInfo): number => {
  if (plugin.is_enabled) {
    return getEffectivePluginStatus(plugin) === 'error' ? 0 : 1;
  }

  return plugin.status === 'error' ? 3 : 2;
};

export const comparePlugins = (a: PluginInfo, b: PluginInfo): number => {
  const rankDiff = getPluginSortRank(a) - getPluginSortRank(b);
  if (rankDiff !== 0) return rankDiff;

  const typeDiff = (a.plugin_type === 'custom' ? 0 : 1) - (b.plugin_type === 'custom' ? 0 : 1);
  if (typeDiff !== 0) return typeDiff;

  const priorityDiff = a.priority - b.priority;
  if (priorityDiff !== 0) return priorityDiff;

  return a.name.localeCompare(b.name);
};

export const getChannelSortRank = (channel: TGChannel): number => {
  const healthStatus = channel.health_status || 'untested';

  if (channel.is_enabled) {
    return healthStatus === 'error' ? 0 : 1;
  }

  if (healthStatus === 'healthy') return 2;
  if (healthStatus === 'untested') return 3;
  return 4;
};

export const compareChannels = (a: TGChannel, b: TGChannel): number => {
  const rankDiff = getChannelSortRank(a) - getChannelSortRank(b);
  if (rankDiff !== 0) return rankDiff;

  const sortOrderDiff = a.sort_order - b.sort_order;
  if (sortOrderDiff !== 0) return sortOrderDiff;

  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;

  return a.id - b.id;
};
