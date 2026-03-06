import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PluginInfo } from '@/types/api';
import {
  createEmptyAddPluginForm,
  type AddPluginForm,
  type EditPluginForm,
  type URLTestStatus,
} from '@/components/admin/pluginManageDialogShared';

type DeleteConfirmState = { open: boolean; pluginName: string | null };

export type UsePluginManageDialogStateResult = {
  addDialogOpen: boolean;
  addForm: AddPluginForm;
  urlTestResult: URLTestStatus;
  urlTestMessage: string;
  detailPluginName: string | null;
  editingPluginName: string | null;
  editForm: EditPluginForm;
  deleteConfirm: DeleteConfirmState;
  batchDeleteConfirmOpen: boolean;
  activeDetailPlugin: PluginInfo | null;
  activeEditingPlugin: PluginInfo | null;
  setAddDialogOpen: (open: boolean) => void;
  setAddForm: React.Dispatch<React.SetStateAction<AddPluginForm>>;
  setUrlTestResult: (status: URLTestStatus) => void;
  setUrlTestMessage: (message: string) => void;
  setDetailPluginName: (name: string | null) => void;
  setEditingPluginName: (name: string | null) => void;
  setEditForm: React.Dispatch<React.SetStateAction<EditPluginForm>>;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<DeleteConfirmState>>;
  setBatchDeleteConfirmOpen: (open: boolean) => void;
  resetAddDialogState: () => void;
  openAddDialog: () => void;
  handleOpenDetail: (plugin: PluginInfo) => void;
  openEditDialog: (plugin: PluginInfo) => void;
};

export function usePluginManageDialogState(
  isOpen: boolean,
  localPlugins: PluginInfo[],
  isReadOnly: boolean
): UsePluginManageDialogStateResult {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddPluginForm>(createEmptyAddPluginForm);
  const [urlTestResult, setUrlTestResult] = useState<URLTestStatus>('idle');
  const [urlTestMessage, setUrlTestMessage] = useState('');
  const [detailPluginName, setDetailPluginName] = useState<string | null>(null);
  const [editingPluginName, setEditingPluginName] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditPluginForm>({
    priority: 0,
    description: '',
    url: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    pluginName: null,
  });
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);

  const resetAddDialogState = useCallback(() => {
    setAddDialogOpen(false);
    setAddForm(createEmptyAddPluginForm());
    setUrlTestResult('idle');
    setUrlTestMessage('');
  }, []);

  useEffect(() => {
    if (isOpen) return;
    setDeleteConfirm({ open: false, pluginName: null });
    setBatchDeleteConfirmOpen(false);
    setDetailPluginName(null);
    setEditingPluginName(null);
    resetAddDialogState();
  }, [isOpen, resetAddDialogState]);

  const activeDetailPlugin = useMemo(
    () => localPlugins.find((plugin) => plugin.name === detailPluginName) || null,
    [detailPluginName, localPlugins]
  );

  const activeEditingPlugin = useMemo(
    () => localPlugins.find((plugin) => plugin.name === editingPluginName) || null,
    [editingPluginName, localPlugins]
  );

  const openAddDialog = useCallback(() => {
    if (isReadOnly) return;
    resetAddDialogState();
    setAddDialogOpen(true);
  }, [isReadOnly, resetAddDialogState]);

  const handleOpenDetail = useCallback((plugin: PluginInfo) => {
    setDetailPluginName(plugin.name);
  }, []);

  const openEditDialog = useCallback((plugin: PluginInfo) => {
    setEditingPluginName(plugin.name);
    setEditForm({
      priority: plugin.priority,
      description: plugin.description,
      url: plugin.url || '',
    });
  }, []);

  return {
    addDialogOpen,
    addForm,
    urlTestResult,
    urlTestMessage,
    detailPluginName,
    editingPluginName,
    editForm,
    deleteConfirm,
    batchDeleteConfirmOpen,
    activeDetailPlugin,
    activeEditingPlugin,
    setAddDialogOpen,
    setAddForm,
    setUrlTestResult,
    setUrlTestMessage,
    setDetailPluginName,
    setEditingPluginName,
    setEditForm,
    setDeleteConfirm,
    setBatchDeleteConfirmOpen,
    resetAddDialogState,
    openAddDialog,
    handleOpenDetail,
    openEditDialog,
  };
}
