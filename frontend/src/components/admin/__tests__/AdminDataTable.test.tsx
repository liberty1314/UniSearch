import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminDataTable } from '@/components/admin/AdminDataTable';

describe('AdminDataTable', () => {
  it('opens and closes desktop overlay for an interactive row', async () => {
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
});
