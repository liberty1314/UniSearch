import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, CirclePlus, Loader2, PencilLine, Trash2, X } from 'lucide-react';
import type { AdminTagOption, AdminTagScope } from "@/types/admin";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ADMIN_DROPDOWN_BACKDROP_Z_INDEX,
  ADMIN_DROPDOWN_ITEM_CLASSES,
  ADMIN_DROPDOWN_LAYER_Z_INDEX,
  ADMIN_DROPDOWN_PANEL_CLASSES,
  ADMIN_DROPDOWN_TRIGGER_CLASSES,
  computeFloatingDropdownPosition,
  estimateDropdownContentWidth,
} from './adminDropdown';
import {
  normalizeTagName,
  normalizeSingleTagSelection,
  removeTagName,
  replaceTagName,
  toggleTagSelection,
} from './adminTagUtils';

interface AdminTagMultiSelectProps {
  scope: AdminTagScope;
  value: string[];
  options: AdminTagOption[];
  placeholder: string;
  triggerAriaLabel?: string;
  triggerTestId?: string;
  panelTestId?: string;
  disabled?: boolean;
  loading?: boolean;
  creating?: boolean;
  updatingTagId?: number | null;
  deletingTagId?: number | null;
  allowCreate?: boolean;
  allowManageOptions?: boolean;
  showCreateAction?: boolean;
  showSelectedSummary?: boolean;
  autoSelectCreatedTag?: boolean;
  maxSelectedVisible?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onChange: (nextValue: string[]) => void;
  onCreateTag?: (name: string) => Promise<AdminTagOption | null>;
  onUpdateTag?: (id: number, name: string) => Promise<AdminTagOption | null>;
  onDeleteTag?: (id: number) => Promise<boolean>;
}

const getScopeLabel = (scope: AdminTagScope): string => (scope === 'plugin' ? '插件' : '频道');

export const AdminTagMultiSelect: React.FC<AdminTagMultiSelectProps> = ({
  scope,
  value,
  options,
  placeholder,
  triggerAriaLabel,
  triggerTestId,
  panelTestId,
  disabled = false,
  loading = false,
  creating = false,
  updatingTagId = null,
  deletingTagId = null,
  allowCreate = true,
  allowManageOptions = false,
  showCreateAction = true,
  showSelectedSummary = true,
  autoSelectCreatedTag = true,
  maxSelectedVisible = 3,
  searchPlaceholder,
  emptyMessage,
  onChange,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [createdTagName, setCreatedTagName] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTagOption | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState<React.CSSProperties>({});
  const [triggerWidth, setTriggerWidth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isInsideModalSurface = useCallback((target: Node) => {
    if (!(target instanceof Element)) {
      return false;
    }
    // 删除确认框是 portal 到 body 的，点击其中任何元素都不应被当成“点击下拉外部”。
    return Boolean(target.closest('[role="alertdialog"], [role="dialog"]'));
  }, []);

  const normalizedKeyword = normalizeTagName(keyword);
  const normalizedSelected = useMemo(
    () => normalizeSingleTagSelection(value),
    [value]
  );
  const visibleTriggerTags = normalizedSelected.slice(0, maxSelectedVisible);
  const hiddenTriggerTagCount = Math.max(0, normalizedSelected.length - maxSelectedVisible);

  const filteredOptions = useMemo(() => {
    const loweredKeyword = normalizedKeyword.toLowerCase();
    const nextOptions = options.filter((option) => (
      loweredKeyword ? option.name.toLowerCase().includes(loweredKeyword) : true
    ));

    return nextOptions.sort((left, right) => {
      const leftSelected = normalizedSelected.some((item) => item.toLowerCase() === left.name.toLowerCase());
      const rightSelected = normalizedSelected.some((item) => item.toLowerCase() === right.name.toLowerCase());
      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'zh-CN', { sensitivity: 'base' });
    });
  }, [normalizedKeyword, normalizedSelected, options]);

  const canCreate = useMemo(() => {
    if (!allowCreate) {
      return false;
    }
    if (!normalizedKeyword) {
      return false;
    }
    return !options.some((option) => option.name.toLowerCase() === normalizedKeyword.toLowerCase());
  }, [allowCreate, normalizedKeyword, options]);

  const showManageActions = allowManageOptions && manageMode;

  const estimatedPanelHeight = useMemo(() => {
    const searchBlockHeight = 44;
    const createBlockHeight = 0;
    const selectedSummaryHeight = showSelectedSummary ? (normalizedSelected.length > 0 ? 40 : 24) : 0;
    const listBaseHeight = filteredOptions.length > 0
      ? Math.min(filteredOptions.length, 6) * 52 + (filteredOptions.length > 6 ? 12 : 0)
      : 88;
    const editBufferHeight = editingTagId !== null ? 56 : 0;
    const paddingAndGaps = 56;

    return Math.min(
      560,
      Math.max(
        220,
        searchBlockHeight + createBlockHeight + selectedSummaryHeight + listBaseHeight + editBufferHeight + paddingAndGaps
      )
    );
  }, [
    editingTagId,
    filteredOptions.length,
    normalizedSelected.length,
    showSelectedSummary,
  ]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    setTriggerWidth(rect.width);

    const widthLabels = [
      placeholder,
      searchPlaceholder || `搜索${getScopeLabel(scope)}标签`,
      emptyMessage || '',
      normalizedKeyword,
      ...filteredOptions.map((option) => option.name),
      ...normalizedSelected,
    ].filter(Boolean);

    const estimatedWidth = estimateDropdownContentWidth(widthLabels, {
      minWidth: Math.max(rect.width, 280),
      maxWidth: Math.max(rect.width, Math.min(520, window.innerWidth - 24)),
      extraWidth: 88,
    });

    const next = computeFloatingDropdownPosition(rect, estimatedWidth, estimatedPanelHeight);
    setFloatingStyle({
      position: 'fixed',
      top: next.top,
      left: next.left,
      width: next.width,
      maxHeight: next.maxHeight,
    });
  }, [
    emptyMessage,
    estimatedPanelHeight,
    filteredOptions,
    normalizedKeyword,
    normalizedSelected,
    placeholder,
    scope,
    searchPlaceholder,
  ]);

  useEffect(() => {
    if (!open) {
      setKeyword('');
      setEditingTagId(null);
      setEditingName('');
      setCreatedTagName('');
      setManageMode(false);
      setDeleteTarget(null);
      setDeleteConfirmOpen(false);
      return;
    }

    updatePosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isInsideModalSurface(target)) {
        return;
      }
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isInsideModalSurface, open, updatePosition]);

  const handleToggle = (name: string) => {
    onChange(toggleTagSelection(normalizedSelected, name));
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, name: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    handleToggle(name);
  };

  const handleCreate = async () => {
    if (disabled || creating) {
      return;
    }

    if (!canCreate || !onCreateTag) {
      if (allowManageOptions) {
        setManageMode((current) => !current);
      }
      return;
    }

    const created = await onCreateTag(normalizedKeyword);
    if (!created) {
      return;
    }

    setManageMode(true);
    if (autoSelectCreatedTag) {
      onChange(toggleTagSelection(normalizedSelected, created.name));
      setKeyword('');
    } else {
      setCreatedTagName(created.name);
    }
  };

  const handleStartEdit = (option: AdminTagOption) => {
    setEditingTagId(option.id);
    setEditingName(option.name);
  };

  const handleSaveEdit = async (option: AdminTagOption) => {
    if (!onUpdateTag) {
      return;
    }

    const updated = await onUpdateTag(option.id, editingName);
    if (!updated) {
      return;
    }

    if (normalizedSelected.some((item) => item.toLowerCase() === option.name.toLowerCase())) {
      onChange(replaceTagName(normalizedSelected, option.name, updated.name));
    }
    setEditingTagId(null);
    setEditingName('');
  };

  const handleDelete = async (option: AdminTagOption) => {
    if (!onDeleteTag) {
      return;
    }
    setDeleteTarget(option);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async (option: AdminTagOption) => {
    if (!onDeleteTag) {
      return;
    }
    const deleted = await onDeleteTag(option.id);
    if (!deleted) {
      return;
    }

    if (normalizedSelected.some((item) => item.toLowerCase() === option.name.toLowerCase())) {
      onChange(removeTagName(normalizedSelected, option.name));
    }
    if (editingTagId === option.id) {
      setEditingTagId(null);
      setEditingName('');
    }
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  const panel = open && typeof document !== 'undefined'
    ? createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${ADMIN_DROPDOWN_BACKDROP_Z_INDEX} bg-transparent`}
        >
              <motion.div
                ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              style={{
                ...floatingStyle,
                height: estimatedPanelHeight,
              }}
            data-testid={panelTestId || `${scope}-tag-selector-panel`}
            className={cn(
              ADMIN_DROPDOWN_PANEL_CLASSES,
              `${ADMIN_DROPDOWN_LAYER_Z_INDEX} flex max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-3`
            )}
          >
            <div className="flex items-center gap-2">
              <Input
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setCreatedTagName('');
                }}
                placeholder={searchPlaceholder || `搜索${getScopeLabel(scope)}标签`}
                className="h-11 rounded-[1rem] border-slate-200/80 bg-white/80 text-sm shadow-none dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.58]"
                containerClassName="flex-1"
                reserveMessageSpace={false}
              />
              {showCreateAction ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => void handleCreate()}
                  disabled={creating || disabled}
                  aria-label={
                    canCreate
                      ? `新增标签 ${normalizedKeyword}`
                      : manageMode
                        ? '关闭标签管理'
                        : '开启标签管理'
                  }
                  className={cn(
                    'h-11 w-11 shrink-0 rounded-[1rem] border-slate-200/80 bg-white/80 text-slate-600 shadow-none hover:bg-slate-50 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.58] dark:text-slate-200 dark:hover:bg-cyan-400/[0.08]',
                    manageMode && !canCreate ? 'border-cyan-300/80 text-cyan-600 dark:border-cyan-500/60 dark:text-cyan-300' : '',
                  )}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CirclePlus className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>

            {!autoSelectCreatedTag && createdTagName ? (
              <div className="mt-2 flex items-center gap-2 rounded-[0.9rem] border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                <span>已创建标签</span>
                <Badge variant="secondary" className="rounded-full">
                  {createdTagName}
                </Badge>
              </div>
            ) : null}

            {showSelectedSummary ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {normalizedSelected.length > 0 ? (
                  <>
                    {normalizedSelected.slice(0, maxSelectedVisible).map((tag) => (
                      <Badge key={`selected-${tag}`} variant="secondary" className="gap-1 rounded-full pr-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleToggle(tag)}
                          className="rounded-full p-0.5 text-slate-500 hover:bg-black/5 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white"
                          aria-label={`移除标签 ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {normalizedSelected.length > maxSelectedVisible ? (
                      <Badge variant="outline" className="rounded-full">
                        +{normalizedSelected.length - maxSelectedVisible}
                      </Badge>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">还没有选择标签</p>
                )}
              </div>
            ) : null}

            <ScrollArea className="mt-3 min-h-0 flex-1 rounded-[1rem] border border-slate-200/70 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.30]">
              <div className="space-y-1 p-2">
                {loading ? (
                  <div className="flex h-20 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在加载标签
                  </div>
                ) : filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const checked = normalizedSelected.some((item) => item.toLowerCase() === option.name.toLowerCase());
                    const isEditing = editingTagId === option.id;
                    const canManageCurrentOption = showManageActions && option.id > 0;
                    return (
                      <div
                        key={`${option.scope}-${option.id}-${option.name}`}
                        onClick={() => !isEditing && handleToggle(option.name)}
                        onKeyDown={(event) => !isEditing && handleOptionKeyDown(event, option.name)}
                        role="button"
                        tabIndex={0}
                        aria-pressed={checked}
                        className={cn(
                          ADMIN_DROPDOWN_ITEM_CLASSES,
                          'flex items-center justify-between rounded-[0.95rem] px-3 py-2 text-left',
                          checked ? 'bg-slate-100/80 text-slate-900 dark:bg-white/10 dark:text-white' : 'hover:bg-slate-100/80 dark:hover:bg-white/5'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                className="h-9"
                                containerClassName="flex-1"
                                reserveMessageSpace={false}
                                autoFocus
                              />
                              <div className="flex shrink-0 items-center gap-2 self-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleSaveEdit(option);
                                  }}
                                  disabled={updatingTagId === option.id}
                                  className="h-9 rounded-full"
                                  aria-label={`保存标签 ${option.name}`}
                                >
                                  {updatingTagId === option.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setEditingTagId(null);
                                    setEditingName('');
                                  }}
                                  className="h-9 rounded-full"
                                  aria-label={`取消编辑标签 ${option.name}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                        ) : (
                            <div className="min-w-0">
                              <p className="truncate text-sm">{option.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {checked ? '已选中，点击可取消' : '点击即可选择'}
                              </p>
                            </div>
                          )}
                        </div>
                        {!isEditing ? (
                          <div className="ml-3 flex items-center gap-1">
                            {checked ? <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-300" /> : null}
                            {canManageCurrentOption ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleStartEdit(option);
                                  }}
                                  className="h-8 w-8 rounded-full"
                                  aria-label={`编辑标签 ${option.name}`}
                                >
                                  <PencilLine className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDelete(option);
                                  }}
                                  disabled={deletingTagId === option.id}
                                  className="h-8 w-8 rounded-full text-red-500 hover:text-red-600"
                                  aria-label={`删除标签 ${option.name}`}
                                >
                                  {deletingTagId === option.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-20 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    {emptyMessage || (allowCreate ? '暂无匹配标签，可搜索后新增' : '暂无匹配标签')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )
    : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        data-testid={triggerTestId || `${scope}-tag-selector-trigger`}
        className={cn(
          ADMIN_DROPDOWN_TRIGGER_CLASSES,
          'flex min-h-[44px] items-center justify-between gap-3 text-left',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-slate-300 dark:hover:border-white/20'
        )}
        aria-label={triggerAriaLabel || `${getScopeLabel(scope)}标签选择器`}
        style={triggerWidth > 0 ? { minWidth: triggerWidth } : undefined}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {normalizedSelected.length > 0 ? (
            <>
              {visibleTriggerTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 rounded-full">
                  {tag}
                </Badge>
              ))}
              {hiddenTriggerTagCount > 0 ? (
                <Badge variant="outline" className="rounded-full">
                  +{hiddenTriggerTagCount}
                </Badge>
              ) : null}
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition', open ? 'rotate-180' : '')} />
      </button>

      {panel}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除标签"
        description={`确定要删除标签“${deleteTarget?.name || ''}”吗？`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            void handleConfirmDelete(deleteTarget);
          }
        }}
        isLoading={Boolean(deleteTarget && deletingTagId === deleteTarget.id)}
      />
    </div>
  );
};
