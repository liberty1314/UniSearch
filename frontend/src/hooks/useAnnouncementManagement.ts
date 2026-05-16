import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnnouncementService } from '@/services/announcementService';
import type { Announcement, AnnouncementPriority, CreateAnnouncementRequest, UpdateAnnouncementRequest } from '@/types/api';
import { getErrorMessage } from '@/lib/error';

export interface AnnouncementFormData {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time: string;
  is_enabled: boolean;
}

export function useAnnouncementManagement() {
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalAnnouncements, setTotalAnnouncements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  const loadFeatureStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const enabled = await AnnouncementService.getAnnouncementFeatureEnabled();
      setFeatureEnabled(enabled);
      setOriginalFeatureEnabled(enabled);
    } catch (error) {
      console.error('加载公告功能状态失败:', error);
      toast.error('加载功能状态失败：' + getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const response = await AnnouncementService.listAnnouncements(
        currentPage,
        pageSize,
        'created_at',
        'desc'
      );
      setAnnouncements(response.announcements);
      setTotalAnnouncements(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('加载公告列表失败:', error);
      toast.error('加载公告列表失败：' + getErrorMessage(error));
    }
  }, [currentPage, pageSize]);

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
    if (!formData.title.trim()) {
      toast.error('请输入公告标题');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('请输入公告内容');
      return;
    }
    if (!formData.start_time) {
      toast.error('请选择生效时间');
      return;
    }
    if (formData.end_time && new Date(formData.end_time) <= new Date(formData.start_time)) {
      toast.error('失效时间必须晚于生效时间');
      return;
    }

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
      loadAnnouncements();
    } catch (error) {
      console.error('保存公告失败:', error);
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
      loadAnnouncements();
    } catch (error) {
      console.error('删除公告失败:', error);
      toast.error('删除失败：' + getErrorMessage(error));
    }
  };

  const handleToggleStatus = async (announcement: Announcement) => {
    try {
      await AnnouncementService.setAnnouncementStatus(announcement.id, !announcement.is_enabled);
      toast.success(announcement.is_enabled ? '已禁用公告' : '已启用公告');
      loadAnnouncements();
    } catch (error) {
      console.error('切换公告状态失败:', error);
      toast.error('操作失败：' + getErrorMessage(error));
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadFeatureStatus();
    loadAnnouncements();
  }, [currentPage, loadFeatureStatus, loadAnnouncements]);

  return {
    state: {
      featureEnabled,
      isLoading,
      isSaving,
      announcements,
      totalAnnouncements,
      totalPages,
      currentPage,
      pageSize,
      isFormOpen,
      formMode,
      editingAnnouncement,
      formData,
      deleteDialogOpen,
      deletingAnnouncement,
    },
    actions: {
      setFormData,
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
    },
  };
}
