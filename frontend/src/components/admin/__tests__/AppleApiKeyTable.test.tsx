import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppleApiKeyTable } from '@/components/admin/AppleApiKeyTable';

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

describe('AppleApiKeyTable', () => {
  it('uses blue/cyan accents for permanent, pending, and toggle action states', () => {
    const permanentKey = {
      id: 1,
      key: 'sk-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      description: 'permanent',
      created_at: '2026-03-01T00:00:00Z',
      last_login_at: '2026-03-10T00:00:00Z',
      expires_at: '2099-01-01T00:00:00Z',
      ttl_hours: 0,
      is_enabled: true,
      daily_search_limit: 0,
      today_search_count: 0,
      last_search_date: '2026-03-10',
      is_permanent: true,
      first_used_at: '2026-03-02T00:00:00Z',
      is_unlimited: true,
    };

    const pendingKey = {
      id: 2,
      key: 'sk-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      description: 'pending',
      created_at: '2026-03-01T00:00:00Z',
      last_login_at: '',
      expires_at: '2099-01-01T00:00:00Z',
      ttl_hours: 720,
      is_enabled: true,
      daily_search_limit: 5,
      today_search_count: 0,
      last_search_date: '',
      is_permanent: false,
      first_used_at: '',
      is_unlimited: false,
    };

    const { container } = render(
      <AppleApiKeyTable
        apiKeys={[permanentKey, pendingKey]}
        selectedKeys={new Set<string>()}
        onSelectKey={vi.fn()}
        onSelectAll={vi.fn()}
        onCopyKey={vi.fn()}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onToggleStatus={vi.fn()}
        isDeleting={false}
        isBatchOperating={false}
        isLoading={false}
      />
    );

    const markup = container.innerHTML;
    expect(screen.getAllByText('永久').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待激活').length).toBeGreaterThan(0);
    expect(markup).toContain('bg-cyan-100');
    expect(markup).toContain('text-cyan-700');
    expect(markup).toContain('hover:bg-cyan-50');
    expect(markup).not.toContain('purple-');
  });
});
