import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminDataTable } from '@/components/admin/AdminDataTable';

describe('AdminDataTable', () => {
  it('可为可交互桌面行打开并关闭详情层', async () => {
    const onOverlayOpenChange = vi.fn();

    render(
      <AdminDataTable
        data={[{ id: 1, name: 'alice' }]}
        columns={[
          {
            key: 'name',
            title: '名称',
            render: (item) => <span>{item.name}</span>,
          },
        ]}
        rowKey={(item) => item.id}
        onOverlayOpenChange={onOverlayOpenChange}
        renderDesktopOverlay={(item, close) => (
          <div>
            <span>Overlay {item.name}</span>
            <button onClick={close}>关闭 Overlay</button>
          </div>
        )}
      />
    );

    expect(screen.queryByText('测试目录')).not.toBeInTheDocument();
    expect(screen.getByText('共 1 条记录')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('row')[1]);

    expect(screen.getByText('Overlay alice')).toBeInTheDocument();
    expect(onOverlayOpenChange).toHaveBeenCalledWith({ id: 1, name: 'alice' });

    fireEvent.click(screen.getByText('关闭 Overlay'));

    await waitFor(() => {
      expect(screen.queryByText('Overlay alice')).not.toBeInTheDocument();
    });
    expect(onOverlayOpenChange).toHaveBeenLastCalledWith(null);
  });

  it('渲染管理栅格行并支持自定义列模板和行强调层', () => {
    const { container } = render(
      <AdminDataTable
        data={[{ id: 1, name: 'alice', status: '正常' }]}
        columns={[
          {
            key: 'name',
            title: '名称',
            desktopGridClassName: 'col-span-7',
            render: (item) => <span>{item.name}</span>,
          },
          {
            key: 'status',
            title: '状态',
            desktopGridClassName: 'col-span-5',
            render: (item) => <span>{item.status}</span>,
          },
        ]}
        rowKey={(item) => item.id}
        desktopVariant="management-grid"
        desktopGridTemplateColumns="minmax(10rem,1fr) minmax(8rem,0.8fr)"
        desktopGridGapClassName="gap-x-5"
        getRowAccentClassName={(item) => (item.status === '正常' ? 'from-green-500/10 to-transparent' : 'from-slate-500/10 to-transparent')}
      />
    );

    expect(screen.getByRole('region', { name: '数据表格' })).toBeInTheDocument();
    expect(container.querySelector('.grid-cols-12')).toBeInTheDocument();
    expect(container.querySelector('.gap-x-5')).toBeInTheDocument();
    expect(container.querySelector('[style*="grid-template-columns"]')).toHaveStyle({
      gridTemplateColumns: 'minmax(10rem,1fr) minmax(8rem,0.8fr)',
    });
    expect(container.querySelector('.min-h-\\[72px\\]')).toBeInTheDocument();
    expect(container.querySelector('.from-green-500\\/10')).toBeInTheDocument();
    expect(container.querySelectorAll('.col-span-7').length).toBeGreaterThan(0);
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('正常').length).toBeGreaterThan(0);
  });
});
