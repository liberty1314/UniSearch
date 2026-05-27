import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
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
});
