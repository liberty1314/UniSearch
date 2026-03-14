import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppleUserTable } from '@/components/admin/AppleUserTable';

vi.mock('@/components/AppleTable', () => ({
  AppleTable: ({
    data,
    columns,
    renderMobileItem,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      key: string;
      title: React.ReactNode;
      render?: (item: Record<string, unknown>) => React.ReactNode;
    }>;
    renderMobileItem?: (item: Record<string, unknown>) => React.ReactNode;
  }) => (
    <div>
      {data.map((item, index) => (
        <div key={index}>
          {columns.map((column) => (
            <div key={column.key} data-testid={`col-${column.key}`}>
              {column.render ? column.render(item) : column.title}
            </div>
          ))}
          {renderMobileItem ? <div data-testid="mobile-item">{renderMobileItem(item)}</div> : null}
        </div>
      ))}
    </div>
  ),
}));

describe('AppleUserTable', () => {
  it('uses blue/cyan accents instead of purple in avatars and status actions', () => {
    const user = {
      id: 2,
      username: 'alice',
      role: 'admin' as const,
      created_at: '2026-03-01T00:00:00Z',
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
  });
});
