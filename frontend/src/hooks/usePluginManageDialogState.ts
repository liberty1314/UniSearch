import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PluginInfo } from "@/types/plugin";

export type UsePluginManageDialogStateResult = {
  detailPluginName: string | null;
  activeDetailPlugin: PluginInfo | null;
  setDetailPluginName: (name: string | null) => void;
  handleOpenDetail: (plugin: PluginInfo) => void;
};

export function usePluginManageDialogState(
  isOpen: boolean,
  localPlugins: PluginInfo[]
): UsePluginManageDialogStateResult {
  const [detailPluginName, setDetailPluginName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setDetailPluginName(null);
  }, [isOpen]);

  const activeDetailPlugin = useMemo(
    () => localPlugins.find((plugin) => plugin.name === detailPluginName) || null,
    [detailPluginName, localPlugins]
  );

  const handleOpenDetail = useCallback((plugin: PluginInfo) => {
    setDetailPluginName(plugin.name);
  }, []);

  return {
    detailPluginName,
    activeDetailPlugin,
    setDetailPluginName,
    handleOpenDetail,
  };
}
