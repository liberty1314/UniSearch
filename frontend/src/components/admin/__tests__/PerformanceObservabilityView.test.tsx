import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PerformanceObservabilityView } from '../PerformanceObservabilityView';

vi.mock('../PluginPerformancePanel', () => ({
  PluginPerformancePanel: () => <div>插件监控内容</div>,
}));

vi.mock('../ChannelPerformancePanel', () => ({
  ChannelPerformancePanel: () => <div>频道监控内容</div>,
}));

describe('PerformanceObservabilityView', () => {
  it('默认显示插件监控并支持切换到频道监控', async () => {
    render(<PerformanceObservabilityView />);

    expect(screen.getByRole('tablist', { name: '性能监控分组' })).toBeInTheDocument();
    expect(screen.getByText('插件监控内容')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: '频道监控' }));

    expect(screen.getByText('频道监控内容')).toBeInTheDocument();
  });
});
