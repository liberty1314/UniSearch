import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApplePagination } from '@/components/admin/ApplePagination';
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
import { AppleSwitch } from '@/components/ui/apple-switch';
import { useAnnouncementManagement } from '@/hooks/useAnnouncementManagement';
import type { AnnouncementPriority } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  getAnnouncementLifecycleColor,
  getAnnouncementLifecycleLabel,
  getAnnouncementLifecycleStatus,
  getAnnouncementPreviewText,
} from '@/lib/announcement';
import {
  ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';
import {
  AdminContentCard,
} from './AdminWorkspacePageFrame';

const getPriorityLabel = (priority: AnnouncementPriority): string => {
  switch (priority) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '';
  }
};

const getPriorityColor = (priority: AnnouncementPriority): string => {
  switch (priority) {
    case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    case 'low': return 'text-blue-600 dark:text-cyan-300 bg-blue-100 dark:bg-cyan-950/40';
    default: return 'text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800/40';
  }
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

export const AnnouncementManagement: React.FC = () => {
  const { state, actions } = useAnnouncementManagement();

  const {
    featureEnabled, isFeatureLoading, isListLoading, isSaving,
    announcements, totalAnnouncements, totalPages, currentPage, pageSize,
    filters, isFormOpen, formMode, formData, fieldErrors,
    deleteDialogOpen, deletingAnnouncement,
  } = state;

  const {
    updateFormField, setIsFormOpen, setDeleteDialogOpen,
    handleToggleFeature, handleCreate, handleEdit, handleSubmit,
    handleDeleteClick, handleDeleteConfirm, handleToggleStatus,
    handlePageSizeChange, setCurrentPage, updateFilters, resetFilters,
  } = actions;

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
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-white">
            <Megaphone className="h-6 w-6 text-blue-600 dark:text-cyan-300" />
            系统公告管理
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            管理系统公告的创建、编辑和发布
          </p>
        </div>
      </div>

      {/* 功能开关卡片 — using AdminContentCard for consistency */}
      <AdminContentCard padding="md">
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
            <Megaphone className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
            公告功能设置
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            控制系统公告功能的全局启用状态
          </p>
        </div>

        {isFeatureLoading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              <RefreshCw className="w-8 h-8 text-blue-600 dark:text-cyan-300" />
            </motion.div>
            <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
          </div>
        ) : (
          <div className="flex items-start justify-between rounded-[1.25rem] border-[0.5px] border-slate-200/50 bg-white/40 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40">
            <div className="flex-1">
              <Label className="text-base font-medium text-slate-800 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600 dark:text-cyan-300" />
                启用系统公告功能
              </Label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                启用后，用户登录时将看到有效的系统公告弹窗
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${featureEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
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
              <AppleSwitch checked={featureEnabled} onCheckedChange={handleToggleFeature} disabled={isSaving} />
            </div>
          </div>
        )}
      </AdminContentCard>

      {/* 公告列表卡片 — using AdminContentCard for consistency */}
      <AdminContentCard padding="md">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
              公告列表
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              管理系统公告的创建、编辑和发布
            </p>
          </div>
          <Button
            onClick={handleCreate}
            className="rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建公告
          </Button>
        </div>

        <div className="mb-5 grid gap-3 rounded-[1.25rem] border-[0.5px] border-slate-200/50 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-slate-900/30 md:grid-cols-4">
          <Input
            value={filters.keyword}
            onChange={(event) => updateFilters({ keyword: event.target.value })}
            placeholder="按标题搜索公告"
            className="bg-white/80 dark:bg-slate-950/40"
          />
          <div className="space-y-2">
            <Label htmlFor="announcement-priority-filter">优先级</Label>
            <Select
              value={filters.priority}
              onValueChange={(value: AnnouncementPriority | 'all') => updateFilters({ priority: value })}
            >
              <SelectTrigger id="announcement-priority-filter" aria-label="优先级筛选">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="high">高优先级</SelectItem>
                <SelectItem value="medium">中优先级</SelectItem>
                <SelectItem value="low">低优先级</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-enabled-filter">启用状态</Label>
            <Select
              value={filters.enabledStatus}
              onValueChange={(value: 'all' | 'enabled' | 'disabled') => updateFilters({ enabledStatus: value })}
            >
              <SelectTrigger id="announcement-enabled-filter" aria-label="启用状态">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="enabled">仅已启用</SelectItem>
                <SelectItem value="disabled">仅已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-lifecycle-filter">生命周期状态</Label>
            <Select
              value={filters.lifecycleStatus}
              onValueChange={(value: 'all' | 'scheduled' | 'active' | 'expired') =>
                updateFilters({ lifecycleStatus: value })
              }
            >
              <SelectTrigger id="announcement-lifecycle-filter" aria-label="生命周期状态">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部生命周期</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="scheduled">未生效</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button
              variant="outline"
              onClick={resetFilters}
              className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-white/10 dark:text-slate-200')}
            >
              重置筛选
            </Button>
          </div>
        </div>

        {isListLoading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              <RefreshCw className="w-8 h-8 text-blue-600 dark:text-cyan-300" />
            </motion.div>
            <p className="mt-4 text-slate-500 dark:text-slate-400">公告列表加载中...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">暂无公告</p>
            <Button
              onClick={handleCreate}
              variant="outline"
              className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'mt-4 border-slate-200/50 text-slate-700 dark:border-white/10 dark:text-slate-200')}
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
                className="rounded-[1.35rem] border-[0.5px] border-slate-200/50 bg-white/40 p-4 shadow-sm backdrop-blur-md transition-all hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-800/40"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                        {announcement.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                        {getPriorityLabel(announcement.priority)}优先级
                      </span>
                      {announcement.is_enabled ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          已启用
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-slate-800/40 dark:text-slate-400">
                          已禁用
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAnnouncementLifecycleColor(getAnnouncementLifecycleStatus(announcement))}`}>
                        {getAnnouncementLifecycleLabel(getAnnouncementLifecycleStatus(announcement))}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      {getAnnouncementPreviewText(announcement.content, 100)}
                    </p>
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
                      className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-white/10 dark:text-slate-200')}
                    >
                      {announcement.is_enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={() => handleEdit(announcement)}
                      variant="outline"
                      size="sm"
                      title="编辑"
                      className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-white/10 dark:text-slate-200')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(announcement)}
                      variant="outline"
                      size="sm"
                      title="删除"
                      className="border-[0.5px] border-red-200/60 text-red-600 hover:border-red-300 hover:bg-red-50/80 hover:text-red-700 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/20 dark:hover:text-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {announcements.length > 0 && (
              <ApplePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalAnnouncements}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
                isLoading={isListLoading}
              />
            )}
          </div>
        )}
      </AdminContentCard>

      {/* 公告表单对话框 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? '创建公告' : '编辑公告'}
            </DialogTitle>
            <DialogDescription>
              配置公告标题、Markdown 内容、生效时间和启用状态，保存后会按生命周期规则向用户展示。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                标题 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormField('title', e.target.value)}
                placeholder="请输入公告标题（最多200字符）"
                maxLength={200}
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-500">{fieldErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                内容 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => updateFormField('content', e.target.value)}
                placeholder="请输入公告内容（支持Markdown语法）"
                rows={8}
                className="font-mono text-sm"
              />
              {fieldErrors.content && (
                <p className="text-xs text-red-500">{fieldErrors.content}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                提示：可以使用Markdown语法格式化内容，如 **加粗**、*斜体*、# 标题 等
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: AnnouncementPriority) => updateFormField('priority', value)}
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
              {fieldErrors.priority && (
                <p className="text-xs text-red-500">{fieldErrors.priority}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">
                生效时间 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => updateFormField('start_time', e.target.value)}
              />
              {fieldErrors.start_time && (
                <p className="text-xs text-red-500">{fieldErrors.start_time}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">失效时间（可选）</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => updateFormField('end_time', e.target.value)}
              />
              {fieldErrors.end_time && (
                <p className="text-xs text-red-500">{fieldErrors.end_time}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                留空表示永久有效
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <AppleSwitch
                checked={formData.is_enabled}
                onCheckedChange={(checked) => updateFormField('is_enabled', checked)}
              />
              <Label>启用公告</Label>
            </div>

            <div className="space-y-2 rounded-[1.25rem] border-[0.5px] border-slate-200/60 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/30">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                实时预览
              </Label>
              <div className="prose prose-sm max-w-none rounded-xl bg-white/80 p-4 text-slate-700 shadow-sm dark:prose-invert dark:bg-slate-950/40 dark:text-slate-200">
                {formData.content.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {formData.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">输入 Markdown 内容后会在这里显示预览</p>
                )}
              </div>
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
