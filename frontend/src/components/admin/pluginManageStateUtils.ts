import type { PluginInfo } from '@/types/api';

type PluginNameSet = Set<string>;

export const markPluginTestResult = (
  plugins: PluginInfo[],
  pluginName: string,
  ok: boolean
): PluginInfo[] =>
  plugins.map((plugin) => {
    if (plugin.name !== pluginName) return plugin;
    if (!ok) return { ...plugin, status: 'error' };
    return {
      ...plugin,
      status: plugin.is_enabled
        ? plugin.plugin_type === 'custom'
          ? 'custom'
          : 'active'
        : 'inactive',
    };
  });

export const updatePluginEnabledState = (
  plugins: PluginInfo[],
  pluginName: string,
  nextEnabled: boolean
): PluginInfo[] =>
  plugins.map((plugin) => {
    if (plugin.name !== pluginName) return plugin;
    return {
      ...plugin,
      is_enabled: nextEnabled,
      status:
        plugin.status === 'error'
          ? 'error'
          : nextEnabled
            ? plugin.plugin_type === 'custom'
              ? 'custom'
              : 'active'
            : 'inactive',
    };
  });

export const applyBatchEnabledState = (
  plugins: PluginInfo[],
  successSet: PluginNameSet,
  nextEnabled: boolean
): PluginInfo[] =>
  plugins.map((plugin) => {
    if (!successSet.has(plugin.name)) return plugin;
    return {
      ...plugin,
      is_enabled: nextEnabled,
      status:
        plugin.status === 'error'
          ? 'error'
          : nextEnabled
            ? plugin.plugin_type === 'custom'
              ? 'custom'
              : 'active'
            : 'inactive',
    };
  });
