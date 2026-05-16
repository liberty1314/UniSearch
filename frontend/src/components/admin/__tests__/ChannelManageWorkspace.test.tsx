import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChannelManageWorkspace } from '../ChannelManageWorkspace';

describe('ChannelManageWorkspace', () => {
  const createWorkspace = (
    overrides: Partial<React.ComponentProps<typeof ChannelManageWorkspace>['workspace']> = {},
  ): React.ComponentProps<typeof ChannelManageWorkspace>['workspace'] => ({
    isOpen: true,
    isReadOnly: true,
    presentation: 'modal' as const,
    isOperationBusy: false,
    isBatchTesting: false,
    loading: false,
    totalChannels: 0,
    statusFilter: 'all' as const,
    filteredItemsCount: 0,
    currentPage: 1,
    totalPages: 1,
    selectedChannelIds: new Set<number>(),
    selectedCount: 0,
    isAllFilteredSelected: false,
    pagedItems: [],
    testingStatus: {},
    deletingIds: new Set<number>(),
    listContainerRef: createRef<HTMLDivElement>(),
    onClose: vi.fn(),
    onSetStatusFilter: vi.fn(),
    onOpenAddDialog: vi.fn(),
    onBatchToggle: vi.fn(),
    onOpenBatchDeleteConfirm: vi.fn(),
    onBatchTest: vi.fn(),
    onToggleSelectFiltered: vi.fn(),
    onSelectChannel: vi.fn(),
    onOpenDetail: vi.fn(),
    onTestChannel: vi.fn(),
    onToggleEnabled: vi.fn(),
    onOpenDeleteConfirm: vi.fn(),
    onPageChange: vi.fn(),
    ...overrides,
  });

  it('在 modal 形态下使用共享弹窗外壳', () => {
    const onClose = vi.fn();

    render(
      <ChannelManageWorkspace
        workspace={createWorkspace({ onClose })}
      />
    );

    const overlay = document.querySelector('.modal-shell-overlay');
    expect(overlay).not.toBeNull();
    expect(screen.getByRole('heading', { name: /Telegram 频道工作台/ })).toBeInTheDocument();

    fireEvent.click(overlay as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('在 page 形态下不渲染遮罩层', () => {
    render(
      <ChannelManageWorkspace
        workspace={createWorkspace({
          presentation: 'page',
          isReadOnly: false,
        })}
      />
    );

    expect(document.querySelector('.modal-shell-overlay')).toBeNull();
    expect(screen.getByRole('heading', { name: /Telegram 频道工作台/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '关闭频道管理' })).not.toBeInTheDocument();
  });
});
