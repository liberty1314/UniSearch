import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnnouncementService } from '@/services/announcementService';
import type {
  Announcement,
  AnnouncementPriority,
  AnnouncementLifecycleStatus,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/types/api';
import { getErrorMessage } from '@/lib/error';

export interface AnnouncementFormData {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time: string;
  is_enabled: boolean;
}

export interface AnnouncementListFilters {
  keyword: string;
  priority: AnnouncementPriority | 'all';
  enabledStatus: 'all' | 'enabled' | 'disabled';
  lifecycleStatus: AnnouncementLifecycleStatus | 'all';
}

type AnnouncementFieldErrorKey = keyof AnnouncementFormData;

const DEFAULT_FILTERS: AnnouncementListFilters = {
  keyword: '',
  priority: 'all',
  enabledStatus: 'all',
  lifecycleStatus: 'all',
};

export function useAnnouncementManagement() {
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);
  const [isFeatureLoading, setIsFeatureLoading] = useState<boolean>(true);
  const [isListLoading, setIsListLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalAnnouncements, setTotalAnnouncements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filters, setFilters] = useState<AnnouncementListFilters>(DEFAULT_FILTERS);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    priority: 'medium',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: '',
    is_enabled: true,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);
  const [originalFeatureEnabled, setOriginalFeatureEnabled] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AnnouncementFieldErrorKey, string>>>({});

  const loadFeatureStatus = useCallback(async () => {
    setIsFeatureLoading(true);
    try {
      const enabled = await AnnouncementService.getAnnouncementFeatureEnabled();
      setFeatureEnabled(enabled);
      setOriginalFeatureEnabled(enabled);
    } catch (error) {
      console.error('加载公告功能状态失败:', error);
      toast.error('加载功能状态失败：' + getErrorMessage(error));
    } finally {
      setIsFeatureLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setIsListLoading(true);
    try {
      const response = await AnnouncementService.listAnnouncements(
        currentPage,
        pageSize,
        'created_at',
        'desc',
        {
          keyword: filters.keyword.trim() || undefined,
          priority: filters.priority === 'all' ? undefined : filters.priority,
          is_enabled: filters.enabledStatus === 'all'
            ? undefined
            : filters.enabledStatus === 'enabled',
          lifecycle_status: filters.lifecycleStatus === 'all' ? undefined : filters.lifecycleStatus,
        }
      );
      setAnnouncements(response.announcements);
      setTotalAnnouncements(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('加载公告列表失败:', error);
      toast.error('加载公告列表失败：' + getErrorMessage(error));
    } finally {
      setIsListLoading(false);
    }
  }, [currentPage, filters.enabledStatus, filters.keyword, filters.lifecycleStatus, filters.priority, pageSize]);

  const handleToggleFeature = async (checked: boolean) => {
    setFeatureEnabled(checked);
    setIsSaving(true);
    try {
      await AnnouncementService.setAnnouncementFeatureEnabled(checked);
      setOriginalFeatureEnabled(checked);
      toast.success(checked ? '已启用系统公告功能' : '已禁用系统公告功能');
    } catch (error) {
      console.error('保存功能状态失败:', error);
      setFeatureEnabled(originalFeatureEnabled);
      toast.error('保存失败：' + getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setFieldErrors({});
    setFormData({
      title: '',
      content: '',
      priority: 'medium',
      start_time: new Date().toISOString().slice(0, 16),
      end_time: '',
      is_enabled: true,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setFormMode('edit');
    setEditingAnnouncement(announcement);
    setFieldErrors({});
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      start_time: new Date(announcement.start_time).toISOString().slice(0, 16),
      end_time: announcement.end_time ? new Date(announcement.end_time).toISOString().slice(0, 16) : '',
      is_enabled: announcement.is_enabled,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    const nextFieldErrors: Partial<Record<AnnouncementFieldErrorKey, string>> = {};
    if (!formData.title.trim()) {
      nextFieldErrors.title = '请输入公告标题';
    }
    if (!formData.content.trim()) {
      nextFieldErrors.content = '请输入公告内容';
    }
    if (!formData.start_time) {
      nextFieldErrors.start_time = '请选择生效时间';
    }
    if (formData.end_time && new Date(formData.end_time) <= new Date(formData.start_time)) {
      nextFieldErrors.end_time = '失效时间必须晚于生效时间';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      toast.error(Object.values(nextFieldErrors)[0] || '表单校验失败');
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      const requestData: CreateAnnouncementRequest | UpdateAnnouncementRequest = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
        is_enabled: formData.is_enabled,
      };

      if (formMode === 'create') {
        await AnnouncementService.createAnnouncement(requestData);
        toast.success('创建公告成功');
      } else if (editingAnnouncement) {
        await AnnouncementService.updateAnnouncement(editingAnnouncement.id, requestData);
        toast.success('更新公告成功');
      }

      setIsFormOpen(false);
      void loadAnnouncements();
    } catch (error) {
      console.error('保存公告失败:', error);
      const field = getAnnouncementFieldErrorKey(error);
      if (field) {
        setFieldErrors((current) => ({
          ...current,
          [field]: getErrorMessage(error, '保存失败'),
        }));
      }
      toast.error('保存失败：' + getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setDeletingAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return;
    try {
      await AnnouncementService.deleteAnnouncement(deletingAnnouncement.id);
      toast.success('删除公告成功');
      setDeleteDialogOpen(false);
      setDeletingAnnouncement(null);
      void loadAnnouncements();
    } catch (error) {
      console.error('删除公告失败:', error);
      toast.error('删除失败：' + getErrorMessage(error));
    }
  };

  const handleToggleStatus = async (announcement: Announcement) => {
    try {
      await AnnouncementService.setAnnouncementStatus(announcement.id, !announcement.is_enabled);
      toast.success(announcement.is_enabled ? '已禁用公告' : '已启用公告');
      void loadAnnouncements();
    } catch (error) {
      console.error('切换公告状态失败:', error);
      toast.error('操作失败：' + getErrorMessage(error));
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const updateFilters = (nextFilters: Partial<AnnouncementListFilters>) => {
    setFilters((current) => ({ ...current, ...nextFilters }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  };

  const updateFormField = <K extends keyof AnnouncementFormData>(field: K, value: AnnouncementFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      return {
        ...current,
        [field]: undefined,
      };
    });
  };

  useEffect(() => {
    void loadFeatureStatus();
  }, [loadFeatureStatus]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    state: {
      featureEnabled,
      isFeatureLoading,
      isListLoading,
      isSaving,
      announcements,
      totalAnnouncements,
      totalPages,
      currentPage,
      pageSize,
      filters,
      isFormOpen,
      formMode,
      editingAnnouncement,
      formData,
      fieldErrors,
      deleteDialogOpen,
      deletingAnnouncement,
    },
    actions: {
      updateFormField,
      setIsFormOpen,
      setDeleteDialogOpen,
      handleToggleFeature,
      handleCreate,
      handleEdit,
      handleSubmit,
      handleDeleteClick,
      handleDeleteConfirm,
      handleToggleStatus,
      handlePageSizeChange,
      setCurrentPage,
      updateFilters,
      resetFilters,
    },
  };
}

function getAnnouncementFieldErrorKey(error: unknown): AnnouncementFieldErrorKey | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const errorObject = error as {
    data?: { data?: { field?: unknown } };
    response?: { data?: { data?: { field?: unknown } } };
  };
  const field = errorObject.data?.data?.field ?? errorObject.response?.data?.data?.field;
  if (
    field === 'title' ||
    field === 'content' ||
    field === 'priority' ||
    field === 'start_time' ||
    field === 'end_time' ||
    field === 'is_enabled'
  ) {
    return field;
  }
  return null;
}
