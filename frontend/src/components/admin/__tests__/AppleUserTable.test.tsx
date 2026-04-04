import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppleUserTable } from '@/components/admin/AppleUserTable';

let receivedShowCount: boolean | undefined;
let overlayClose: ReturnType<typeof vi.fn>;

vi.mock('@/components/admin/AdminDataTable', () => ({
  AdminDataTable: ({
    title,
    data,
    columns,
    showCount,
    renderMobileItem,
    renderDesktopOverlay,
  }: {
    title?: string;
    data: Array<Record<string, unknown>>;
    columns: Array<{
      key: string;
      title: React.ReactNode;
      render?: (item: Record<string, unknown>) => React.ReactNode;
    }>;
    showCount?: boolean;
    renderMobileItem?: (item: Record<string, unknown>) => React.ReactNode;
    renderDesktopOverlay?: (item: Record<string, unknown>, close: () => void) => React.ReactNode;
  }) => {
    receivedShowCount = showCount;

    return (
      <div>
        <div data-testid="table-title">{title}</div>
        {data.map((item, index) => {
          overlayClose = vi.fn();
          return (
            <div key={index}>
              {columns.map((column) => (
                <div key={column.key} data-testid={`col-${column.key}`}>
                  {column.render ? column.render(item) : column.title}
                </div>
              ))}
              {renderDesktopOverlay && index === 0 ? (
                <div data-testid="desktop-overlay">{renderDesktopOverlay(item, overlayClose as unknown as () => void)}</div>
              ) : null}
              {renderMobileItem ? <div data-testid="mobile-item">{renderMobileItem(item)}</div> : null}
            </div>
          );
        })}
      </div>
    );
  },
}));

describe('AppleUserTable', () => {
  it('uses blue/cyan accents instead of purple in avatars and status actions', () => {
    const user = {
      id: 2,
      username: 'alice',
      role: 'admin' as const,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-10T00:00:00Z',
      last_login_at: '2026-03-10T00:00:00Z',
      is_enabled: true,
    };

    const { container } = render(
      <AppleUserTable
        users={[user]}
        selectedUsers={new Set<number>()}
        onSelectUser={vi.fn()}
        onEditClick={vi.fn()}
        onResetPasswordClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onToggleStatus={vi.fn()}
        currentUserId={1}
        isDeleting={false}
        isBatchOperating={false}
        isLoading={false}
      />
    );

    const markup = container.innerHTML;
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
    expect(markup).toContain('from-blue-500');
    expect(markup).toContain('to-cyan-500');
    expect(markup).toContain('hover:bg-cyan-50');
    expect(markup).toContain('text-cyan-700');
    expect(markup).not.toContain('apple-purple');
    expect(markup).not.toContain('purple-');
    expect(receivedShowCount).toBe(false);
    expect(screen.getByTestId('table-title')).toBeEmptyDOMElement();
    expect(screen.queryAllByTestId('col-actions')).toHaveLength(0);
    fireEvent.click(screen.getByLabelText('关闭详情'));
    expect(overlayClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    expect(overlayClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('desktop-overlay')).toHaveTextContent('编辑');
    expect(screen.getByTestId('desktop-overlay')).toHaveTextContent('重置密码');
    expect(screen.getByTestId('desktop-overlay')).toHaveTextContent('禁用');
    expect(screen.getByTestId('desktop-overlay')).toHaveTextContent('删除');
  });
});
