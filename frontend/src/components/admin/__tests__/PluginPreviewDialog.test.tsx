import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PluginPreviewDialog } from '../PluginPreviewDialog';
import type { PluginInfo } from '@/types/api';

const buildPlugins = (): PluginInfo[] =>
  Array.from({ length: 13 }).map((_, index) => ({
    name: `plugin-${index + 1}`,
    priority: index + 1,
    status:
      index === 10
        ? 'custom'
        : index === 11
          ? 'error'
          : index === 12
            ? 'inactive'
            : 'active',
    description: index === 10 ? 'custom source' : `description-${index + 1}`,
  }));

describe('PluginPreviewDialog', () => {
  it('supports search, status filtering, pagination and switch to manage mode', async () => {
    const onClose = vi.fn();
    const onOpenManage = vi.fn();

    render(
      <PluginPreviewDialog
        isOpen
        onClose={onClose}
        onOpenManage={onOpenManage}
        plugins={buildPlugins()}
      />
    );

    expect(screen.getByText('plugin-1')).toBeInTheDocument();
    expect(screen.queryByText('plugin-11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /下一页/i }));
    expect(await screen.findByText('plugin-11')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('按插件名称或描述搜索'), {
      target: { value: 'custom source' },
    });
    expect(await screen.findByText('plugin-11')).toBeInTheDocument();
    expect(screen.queryByText('plugin-12')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '异常' }));
    expect(screen.getByText('无匹配数据')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('按插件名称或描述搜索'), {
      target: { value: '' },
    });
    expect(await screen.findByText('plugin-12')).toBeInTheDocument();
    expect(screen.queryByText('plugin-11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '进入编辑模式' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenManage).toHaveBeenCalledTimes(1);
  });
});
