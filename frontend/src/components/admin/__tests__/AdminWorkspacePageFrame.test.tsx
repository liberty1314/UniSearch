import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AdminDetailDrawer,
  AdminContentCard,
  AdminMetricCard,
  AdminMetricGrid,
  AdminWorkspaceHero,
  AdminWorkspacePageFrame,
} from '@/components/admin/AdminWorkspacePageFrame';

describe('AdminWorkspacePageFrame', () => {
  it('后台页面骨架使用紧凑信息密度', () => {
    const { container } = render(
      <AdminWorkspacePageFrame
        header={<AdminWorkspaceHero icon={<span />} title="标题" description="说明" />}
        metrics={
          <AdminMetricGrid>
            <AdminMetricCard label="总数" value={1} />
          </AdminMetricGrid>
        }
        filters={<AdminContentCard>筛选</AdminContentCard>}
        content={<AdminContentCard>内容</AdminContentCard>}
      />,
    );

    expect(container.firstChild).toHaveClass('space-y-5');
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('筛选').closest('section')).toHaveAttribute('data-compact-surface', 'true');
    expect(screen.getAllByText(/总数|1/).length).toBeGreaterThan(0);
  });

  it('后台页面骨架不再为详情抽屉预留右侧布局列', () => {
    const { container } = render(
      <AdminWorkspacePageFrame
        header={<AdminWorkspaceHero icon={<span />} title="标题" description="说明" />}
        metrics={<AdminMetricGrid><AdminMetricCard label="总数" value={1} /></AdminMetricGrid>}
        filters={<AdminContentCard>筛选</AdminContentCard>}
        content={<AdminContentCard>内容</AdminContentCard>}
        drawer={(
          <AdminDetailDrawer
            open
            title="详情"
            testId="floating-admin-drawer"
            onClose={() => undefined}
            emptyTitle="空"
            emptyDescription="空"
          >
            悬浮内容
          </AdminDetailDrawer>
        )}
      />,
    );

    expect(container.querySelector('.xl\\:grid-cols-\\[minmax\\(0\\,1fr\\)_380px\\]')).not.toBeInTheDocument();
    expect(screen.getByTestId('floating-admin-drawer')).toHaveClass('fixed');
    expect(screen.getByTestId('floating-admin-drawer')).toHaveTextContent('悬浮内容');
  });

  it('详情抽屉关闭时不渲染占位面板', () => {
    render(
      <AdminDetailDrawer
        open={false}
        title="详情"
        testId="closed-admin-drawer"
        onClose={() => undefined}
        emptyTitle="选择一项"
        emptyDescription="关闭时不应该占据页面空间"
      >
        悬浮内容
      </AdminDetailDrawer>,
    );

    expect(screen.queryByTestId('closed-admin-drawer')).not.toBeInTheDocument();
    expect(screen.queryByText('选择一项')).not.toBeInTheDocument();
  });
});
