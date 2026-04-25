import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppleUserTable } from '@/components/admin/AppleUserTable';

let receivedShowCount: boolean | undefined;
let receivedDesktopGridGapClassName: string | undefined;
let receivedDesktopGridTemplateColumns: string | undefined;
let overlayClose: ReturnType<typeof vi.fn>;

vi.mock('@/components/admin/AdminDataTable', () => ({
  AdminDataTable: ({
    title,
    data,
    columns,
    showCount,
    desktopVariant,
    desktopGridGapClassName,
    desktopGridTemplateColumns,
    getRowAccentClassName,
    renderMobileItem,
    renderDesktopOverlay,
  }: {
    title?: string;
    data: Array<Record<string, unknown>>;
    columns: Array<{
      key: string;
      title: React.ReactNode;
      desktopGridClassName?: string;
      render?: (item: Record<string, unknown>, index: number) => React.ReactNode;
    }>;
    showCount?: boolean;
    desktopVariant?: string;
    desktopGridGapClassName?: string;
    desktopGridTemplateColumns?: string;
    getRowAccentClassName?: (item: Record<string, unknown>) => string;
    renderMobileItem?: (item: Record<string, unknown>) => React.ReactNode;
    renderDesktopOverlay?: (item: Record<string, unknown>, close: () => void) => React.ReactNode;
  }) => {
    receivedShowCount = showCount;
    receivedDesktopGridGapClassName = desktopGridGapClassName;
    receivedDesktopGridTemplateColumns = desktopGridTemplateColumns;

    return (
      <div>
        <div data-testid="table-title">{title}</div>
        <div data-testid="desktop-variant">{desktopVariant}</div>
        {data.map((item, index) => {
          overlayClose = vi.fn();
          return (
            <div key={index}>
              <div data-testid="row-accent">{getRowAccentClassName?.(item)}</div>
              {columns.map((column) => (
                <div key={column.key} data-testid={`col-${column.key}`} className={column.desktopGridClassName}>
                  <span data-testid={`col-title-${column.key}`}>{column.title}</span>
                  {column.render ? column.render(item, index) : column.title}
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
  it('使用蓝青色强调并为桌面用户表格传入内容感知列模板', () => {
    const user = {
      id: 2,
      username: 'alice',
      role: 'admin' as const,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-10T00:00:00Z',
      last_login_at: '2026-03-10T00:00:00Z',
      is_enabled: true,
      monthly_login_days: ['2026-04-01', '2026-04-03', '2026-04-10'],
      monthly_login_day_count: 3,
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
    expect(markup).toContain('from-green-500/10');
    expect(markup).not.toContain('apple-purple');
    expect(markup).not.toContain('purple-');
    expect(receivedShowCount).toBe(false);
    expect(receivedDesktopGridGapClassName).toBe('gap-x-5');
    expect(receivedDesktopGridTemplateColumns).toContain('minmax(0,0.72fr)');
    expect(receivedDesktopGridTemplateColumns).toContain('minmax(0,1.45fr)');
    expect(receivedDesktopGridTemplateColumns).toContain('minmax(0,1.5fr)');
    expect(screen.getByTestId('desktop-variant')).toHaveTextContent('management-grid');
    expect(screen.getByTestId('row-accent')).toHaveTextContent('from-green-500/10 to-transparent');
    expect(screen.queryAllByTestId('col-select')).toHaveLength(1);
    expect(screen.getByTestId('col-user')).not.toHaveClass('col-span-4');
    expect(screen.getByTestId('col-monthly_login')).toHaveTextContent('本月登录');
    expect(screen.getByTestId('col-monthly_login')).toHaveTextContent('已登录 3 天');
    expect(screen.getByTestId('col-monthly_login').querySelectorAll('[data-month-login-day]')).toHaveLength(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());
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
    expect(screen.getByTestId('desktop-overlay')).toHaveTextContent('本月登录情况');
    expect(screen.getByTestId('desktop-overlay')).toHaveTextContent('已登录 3 天');
  });
});
