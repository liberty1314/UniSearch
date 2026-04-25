import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PluginManageWorkspace } from '../PluginManageWorkspace';

describe('PluginManageWorkspace', () => {
  it('uses the shared modal shell for workspace overlays', () => {
    const onClose = vi.fn();

    render(
      <PluginManageWorkspace
        workspace={{
          isOpen: true,
          isReadOnly: true,
          isOperationBusy: false,
          isBatchTesting: false,
          localPluginsCount: 0,
          statusFilter: 'all',
          filteredItemsCount: 0,
          currentPage: 1,
          totalPages: 1,
          selectedPluginNames: new Set<string>(),
          selectedCount: 0,
          isAllFilteredSelected: false,
          pagedItems: [],
          testingStatus: {},
          listContainerRef: createRef<HTMLDivElement>(),
          onClose,
          onSetStatusFilter: vi.fn(),
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
        }}
      />
    );

    const overlay = document.querySelector('.modal-shell-overlay');
    expect(overlay).not.toBeNull();
    expect(screen.getByRole('heading', { name: /插件工作台/i }).closest('.modal-shell-surface')).not.toBeNull();
    expect(screen.getByRole('button', { name: '关闭插件管理' })).toHaveClass('modal-shell-close');

    fireEvent.click(overlay as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
