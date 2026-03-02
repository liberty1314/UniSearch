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
    plugin_type: index === 10 ? 'custom' : 'builtin',
    is_enabled: index !== 12,
    description: index === 10 ? 'custom source' : `description-${index + 1}`,
  }));

describe('PluginPreviewDialog', () => {
  it('supports search, status filtering and pagination', async () => {
    render(
      <PluginPreviewDialog
        isOpen
        onClose={vi.fn()}
        plugins={buildPlugins()}
      />
    );

    expect(screen.getByText('plugin-12')).toBeInTheDocument();
    expect(screen.getByText('plugin-11')).toBeInTheDocument();
    expect(screen.getByText('plugin-1')).toBeInTheDocument();
    expect(screen.queryByText('plugin-10')).not.toBeInTheDocument();
    expect(screen.queryByText('plugin-13')).not.toBeInTheDocument();

    const errorNode = screen.getByText('plugin-12');
    const customNode = screen.getByText('plugin-11');
    const activeNode = screen.getByText('plugin-1');
    expect(errorNode.compareDocumentPosition(customNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(customNode.compareDocumentPosition(activeNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(errorNode.compareDocumentPosition(activeNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '启用' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '禁用' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '异常' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '自定义' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /下一页/i }));
    expect(await screen.findByText('plugin-10')).toBeInTheDocument();
    expect(screen.getByText('plugin-13')).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole('button', { name: '禁用' }));
    expect(await screen.findByText('plugin-13')).toBeInTheDocument();
    expect(screen.queryByText('plugin-12')).not.toBeInTheDocument();
  });
});
