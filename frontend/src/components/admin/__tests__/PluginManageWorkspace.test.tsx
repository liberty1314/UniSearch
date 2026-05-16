import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PluginManageWorkspace } from '../PluginManageWorkspace';

describe('PluginManageWorkspace', () => {
  const createWorkspace = (
    overrides: Partial<React.ComponentProps<typeof PluginManageWorkspace>['workspace']> = {},
  ): React.ComponentProps<typeof PluginManageWorkspace>['workspace'] => ({
    isOpen: true,
    isReadOnly: true,
    presentation: 'modal',
    isOperationBusy: false,
    isBatchTesting: false,
    localPluginsCount: 0,
    searchKeyword: '',
    statusFilter: 'all',
    sourceFilter: 'all',
    categoryFilter: 'all',
    capabilityFilter: 'all',
    availableCategories: ['all'],
    availableCapabilities: ['all'],
    isCatalogLoading: false,
    catalogVersion: 'local',
    filteredItemsCount: 0,
    currentPage: 1,
    totalPages: 1,
    selectedPluginNames: new Set<string>(),
    selectedCount: 0,
    isAllFilteredSelected: false,
    pagedItems: [],
    testingStatus: {},
    listContainerRef: createRef<HTMLDivElement>(),
    onClose: vi.fn(),
    onSetSearchKeyword: vi.fn(),
    onSetStatusFilter: vi.fn(),
    onSetSourceFilter: vi.fn(),
    onSetCategoryFilter: vi.fn(),
    onSetCapabilityFilter: vi.fn(),
    onOpenAddDialog: vi.fn(),
    onBatchToggle: vi.fn(),
    onOpenBatchDeleteConfirm: vi.fn(),
    onBatchTest: vi.fn(),
    onToggleSelectFiltered: vi.fn(),
    onSelectPlugin: vi.fn(),
    onOpenDetail: vi.fn(),
    onTestPlugin: vi.fn(),
    onTogglePluginEnabled: vi.fn(),
    onOpenEditDialog: vi.fn(),
    onOpenDeleteConfirm: vi.fn(),
    onPageChange: vi.fn(),
    onInstallPlugin: vi.fn(),
    ...overrides,
  });

  it('uses the shared modal shell for workspace overlays', () => {
    const onClose = vi.fn();

    render(
      <PluginManageWorkspace
        workspace={createWorkspace({ onClose })}
      />
    );

    const overlay = document.querySelector('.modal-shell-overlay');
    expect(overlay).not.toBeNull();
    expect(screen.getByRole('heading', { name: /插件工作台/ }).closest('.modal-shell-surface')).not.toBeNull();
    expect(screen.getByRole('button', { name: '关闭插件管理' })).toHaveClass('modal-shell-close');

    fireEvent.click(overlay as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('在 page 形态下不渲染遮罩层', () => {
    render(
      <PluginManageWorkspace
        workspace={createWorkspace({
          presentation: 'page',
          isReadOnly: false,
        })}
      />
    );

    expect(document.querySelector('.modal-shell-overlay')).toBeNull();
    expect(screen.getByRole('heading', { name: /插件工作台/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '关闭插件管理' })).not.toBeInTheDocument();
  });
});
