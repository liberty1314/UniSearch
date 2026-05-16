import type { PluginInfo } from '@/types/api';
import type { EditPluginForm } from './pluginManageDialogShared';

type PluginNameSet = Set<string>;

export const appendCustomPlugin = (
  plugins: PluginInfo[],
  nextPlugin: PluginInfo
): PluginInfo[] => [
  {
    ...nextPlugin,
    plugin_type: 'custom',
    is_enabled: true,
    status: 'custom',
  },
  ...plugins,
];

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

export const removePluginsByName = (
  plugins: PluginInfo[],
  namesToRemove: PluginNameSet
): PluginInfo[] => plugins.filter((plugin) => !namesToRemove.has(plugin.name));

export const updateEditedPlugin = (
  plugins: PluginInfo[],
  pluginName: string,
  editForm: EditPluginForm,
  responsePlugin?: PluginInfo
): PluginInfo[] =>
  plugins.map((plugin) =>
    plugin.name === pluginName
      ? responsePlugin
        ? {
            ...responsePlugin,
            status: responsePlugin.status ?? plugin.status,
            is_enabled: responsePlugin.is_enabled ?? plugin.is_enabled,
            plugin_type: responsePlugin.plugin_type ?? plugin.plugin_type,
          }
        : {
            ...plugin,
            priority: editForm.priority,
            description: editForm.description,
            url: editForm.url,
          }
      : plugin
  );
