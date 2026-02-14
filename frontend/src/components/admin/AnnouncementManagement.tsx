import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Megaphone,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { AnnouncementService } from '@/services/announcementService';
import type { Announcement, AnnouncementPriority, CreateAnnouncementRequest, UpdateAnnouncementRequest } from '@/types/api';

/**
 * 公告表单数据
 */
interface AnnouncementFormData {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  start_time: string;
  end_time: string;
  is_enabled: boolean;
}

/**
 * 公告管理主组件
 * 
 * 提供公告功能的完整管理界面，包括：
 * - 功能开关控制（顶部）
 * - 公告列表展示
 * - 公告创建、编辑、删除操作
 * 
 * 验证需求: 4.1, 13.1
 */
export const AnnouncementManagement: React.FC = () => {
  // 状态管理
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  // 表单状态
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

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);

  // 原始值（用于错误恢复）
  const [originalFeatureEnabled, setOriginalFeatureEnabled] = useState<boolean>(false);

  /**
   * 加载公告功能状态
   */
  const loadFeatureStatus = async () => {
    setIsLoading(true);
    try {
      const enabled = await AnnouncementService.getAnnouncementFeatureEnabled();
      setFeatureEnabled(enabled);
      setOriginalFeatureEnabled(enabled);
    } catch (error: any) {
      console.error('加载公告功能状态失败:', error);
      toast.error('加载功能状态失败：' + (error.message || '未知错误'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 加载公告列表
   */
  const loadAnnouncements = async () => {
    try {
      const response = await AnnouncementService.listAnnouncements(
        currentPage,
        pageSize,
        'created_at',
        'desc'
      );
      setAnnouncements(response.announcements);
      setTotalPages(response.total_pages);
    } catch (error: any) {
      console.error('加载公告列表失败:', error);
      toast.error('加载公告列表失败：' + (error.message || '未知错误'));
    }
  };

  /**
   * 处理功能开关变化
   */
  const handleToggleFeature = async (checked: boolean) => {
    setFeatureEnabled(checked);
    setIsSaving(true);

    try {
      await AnnouncementService.setAnnouncementFeatureEnabled(checked);
      setOriginalFeatureEnabled(checked);
      toast.success(checked ? '已启用系统公告功能' : '已禁用系统公告功能');
    } catch (error: any) {
      console.error('保存功能状态失败:', error);
      setFeatureEnabled(originalFeatureEnabled);
      toast.error('保存失败：' + (error.message || '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 打开创建表单
   */
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

  /**
   * 打开编辑表单
   */
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

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    // 验证必填字段
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

    // 验证时间逻辑
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
    } catch (error: any) {
      console.error('保存公告失败:', error);
      toast.error('保存失败：' + (error.message || '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 打开删除确认对话框
   */
  const handleDeleteClick = (announcement: Announcement) => {
    setDeletingAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };

  /**
   * 确认删除
   */
  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return;

    try {
      await AnnouncementService.deleteAnnouncement(deletingAnnouncement.id);
      toast.success('删除公告成功');
      setDeleteDialogOpen(false);
      setDeletingAnnouncement(null);
      loadAnnouncements();
    } catch (error: any) {
      console.error('删除公告失败:', error);
      toast.error('删除失败：' + (error.message || '未知错误'));
    }
  };

  /**
   * 切换公告状态
   */
  const handleToggleStatus = async (announcement: Announcement) => {
    try {
      await AnnouncementService.setAnnouncementStatus(announcement.id, !announcement.is_enabled);
      toast.success(announcement.is_enabled ? '已禁用公告' : '已启用公告');
      loadAnnouncements();
    } catch (error: any) {
      console.error('切换公告状态失败:', error);
      toast.error('操作失败：' + (error.message || '未知错误'));
    }
  };

  useEffect(() => {
    loadFeatureStatus();
    loadAnnouncements();
  }, [currentPage]);

  /**
   * 获取优先级显示文本
   */
  const getPriorityLabel = (priority: AnnouncementPriority): string => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '';
    }
  };

  /**
   * 获取优先级颜色
   */
  const getPriorityColor = (priority: AnnouncementPriority): string => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * 渲染开关组件
   */
  const renderToggle = (checked: boolean, onChange: (checked: boolean) => void, disabled: boolean) => (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            系统公告管理
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            管理系统公告的创建、编辑和发布
          </p>
        </div>
      </div>

      {/* 功能开关卡片 */}
      <Card className="border-gray-100 dark:border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            公告功能设置
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            控制系统公告功能的全局启用状态
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </motion.div>
              <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
            </div>
          ) : (
            <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <div className="flex-1">
                <Label className="text-base font-medium text-slate-800 dark:text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  启用系统公告功能
                </Label>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  启用后，用户登录时将看到有效的系统公告弹窗
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full ${featureEnabled ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                    ></div>
                    <span className="text-slate-600 dark:text-slate-300">
                      {featureEnabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  {!featureEnabled && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pl-4">
                      功能禁用时，用户不会看到任何公告弹窗
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                {renderToggle(featureEnabled, handleToggleFeature, isSaving)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 公告列表卡片 */}
      <Card className="border-gray-100 dark:border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                公告列表
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                管理系统公告的创建、编辑和发布
              </CardDescription>
            </div>
            <Button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建公告
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">暂无公告</p>
              <Button
                onClick={handleCreate}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建第一个公告
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                          {announcement.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                            announcement.priority
                          )}`}
                        >
                          {getPriorityLabel(announcement.priority)}优先级
                        </span>
                        {announcement.is_enabled ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            已启用
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                            已禁用
                          </span>
                        )}
                      </div>
                      <div
                        className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: announcement.content.replace(/<[^>]*>/g, '').slice(0, 100) + '...',
                        }}
                      />
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          生效: {formatDateTime(announcement.start_time)}
                        </div>
                        {announcement.end_time && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            失效: {formatDateTime(announcement.end_time)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-start">
                      <Button
                        onClick={() => handleToggleStatus(announcement)}
                        variant="outline"
                        size="sm"
                        title={announcement.is_enabled ? '禁用' : '启用'}
                      >
                        {announcement.is_enabled ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        onClick={() => handleEdit(announcement)}
                        variant="outline"
                        size="sm"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(announcement)}
                        variant="outline"
                        size="sm"
                        title="删除"
                        className="text-red-600 hover:text-red-700 hover:border-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                上一页
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                第 {currentPage} / {totalPages} 页
              </span>
              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 公告表单对话框 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? '创建公告' : '编辑公告'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                标题 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入公告标题（最多200字符）"
                maxLength={200}
              />
            </div>

            {/* 内容 */}
            <div className="space-y-2">
              <Label htmlFor="content">
                内容 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入公告内容（支持HTML格式）"
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                提示：可以使用HTML标签格式化内容，如 &lt;p&gt;、&lt;strong&gt;、&lt;br&gt; 等
              </p>
            </div>

            {/* 优先级 */}
            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: AnnouncementPriority) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高优先级</SelectItem>
                  <SelectItem value="medium">中优先级</SelectItem>
                  <SelectItem value="low">低优先级</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 生效时间 */}
            <div className="space-y-2">
              <Label htmlFor="start_time">
                生效时间 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            {/* 失效时间 */}
            <div className="space-y-2">
              <Label htmlFor="end_time">失效时间（可选）</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                留空表示永久有效
              </p>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFormData({ ...formData, is_enabled: !formData.is_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.is_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
              <Label>启用公告</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsFormOpen(false)}
              variant="outline"
              disabled={isSaving}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              确认删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除公告「{deletingAnnouncement?.title}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};
