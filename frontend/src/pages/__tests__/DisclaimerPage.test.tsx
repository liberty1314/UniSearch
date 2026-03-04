import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DisclaimerPage from '@/pages/DisclaimerPage';

describe('DisclaimerPage', () => {
  it('renders heading and key disclaimer sections', () => {
    render(<DisclaimerPage />);

    expect(
      screen.getByRole('heading', { name: '免责声明', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('Legal Notice')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. 服务性质与平台定位', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4. 风险提示与责任限制', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '6. 条款更新与生效', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/公开网络信息检索与索引服务/)).toBeInTheDocument();
    expect(screen.getByText(/权益均归原权利人所有/)).toBeInTheDocument();
  });

  it('renders mailto contact link', () => {
    render(<DisclaimerPage />);

    const emailLink = screen.getByRole('link', { name: 'UniSearch@163.com' });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:UniSearch@163.com');
  });
});
