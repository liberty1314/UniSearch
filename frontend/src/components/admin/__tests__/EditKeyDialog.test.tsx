import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { EditKeyDialog } from '@/components/admin/EditKeyDialog';
import type { APIKeyInfo } from '@/types/api';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/components/ui/select', () => {
  const SelectTrigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectValue = () => null;
  const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

  const extractSelectConfig = (node: React.ReactNode) => {
    let ariaLabel = '';
    let placeholder = '';
    const options: Array<{ value: string; label: React.ReactNode }> = [];

    const visit = (child: React.ReactNode) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const element = child as React.ReactElement<Record<string, unknown>>;

      if (element.type === SelectTrigger && element.props['aria-label']) {
        ariaLabel = element.props['aria-label'] as string;
      }

      if (element.type === SelectValue && element.props.placeholder) {
        placeholder = element.props.placeholder as string;
      }

      if (element.type === SelectItem) {
        options.push({
          value: element.props.value as string,
          label: element.props.children as React.ReactNode,
        });
      }

      React.Children.forEach(element.props.children, visit);
    };

    React.Children.forEach(node, visit);
    return { ariaLabel, placeholder, options };
  };

  const Select = ({
    value,
    onValueChange,
    children,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => {
    const { ariaLabel, placeholder, options } = extractSelectConfig(children);

    return (
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

const apiKey: APIKeyInfo = {
  id: 1,
  key: 'sk-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  description: 'test key',
  created_at: '2026-03-01T00:00:00Z',
  first_used_at: '2026-03-02T00:00:00Z',
  expires_at: '2099-01-01T00:00:00Z',
  ttl_hours: 720,
  is_enabled: true,
  daily_search_limit: 10,
  today_search_count: 0,
  last_search_date: '2026-03-10',
  last_login_at: '2026-03-10T00:00:00Z',
  is_permanent: false,
  is_unlimited: false,
};

describe('EditKeyDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthService, 'updateApiKey').mockResolvedValue(apiKey);
  });

  it('does not send extend_hours when only daily search limit changes', async () => {
    const user = userEvent.setup();

    render(
      <EditKeyDialog
        open
        onOpenChange={vi.fn()}
        apiKey={apiKey}
        onSuccess={vi.fn()}
      />
    );

    const dailyLimitInput = screen.getByLabelText('每日搜索次数限制');
    await user.clear(dailyLimitInput);
    await user.type(dailyLimitInput, '25');
    await user.click(screen.getByRole('button', { name: '确认更新' }));

    await waitFor(() => {
      expect(AuthService.updateApiKey).toHaveBeenCalledWith(apiKey.key, undefined, undefined, 25);
    });
  });

  it('converts preset day selection to hours before submitting', async () => {
    const user = userEvent.setup();

    render(
      <EditKeyDialog
        open
        onOpenChange={vi.fn()}
        apiKey={apiKey}
        onSuccess={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByRole('combobox', { name: '延长天数' }), '30');
    await user.click(screen.getByRole('button', { name: '确认更新' }));

    await waitFor(() => {
      expect(AuthService.updateApiKey).toHaveBeenCalledWith(apiKey.key, undefined, 720, undefined);
    });
  });

  it('submits custom day selection after converting to hours', async () => {
    const user = userEvent.setup();

    render(
      <EditKeyDialog
        open
        onOpenChange={vi.fn()}
        apiKey={apiKey}
        onSuccess={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByRole('combobox', { name: '延长天数' }), 'custom');

    const customDaysInput = await screen.findByLabelText('自定义延长天数');
    await user.type(customDaysInput, '15');
    await user.click(screen.getByRole('button', { name: '确认更新' }));

    await waitFor(() => {
      expect(AuthService.updateApiKey).toHaveBeenCalledWith(apiKey.key, undefined, 360, undefined);
    });
  });

  it('shows a no-change message and skips submit when nothing changed', async () => {
    const user = userEvent.setup();

    render(
      <EditKeyDialog
        open
        onOpenChange={vi.fn()}
        apiKey={apiKey}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '确认更新' }));

    expect(toast.info).toHaveBeenCalledWith('未检测到变更');
    expect(AuthService.updateApiKey).not.toHaveBeenCalled();
  });

  it('blocks invalid custom day input', async () => {
    const user = userEvent.setup();

    render(
      <EditKeyDialog
        open
        onOpenChange={vi.fn()}
        apiKey={apiKey}
        onSuccess={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByRole('combobox', { name: '延长天数' }), 'custom');

    const customDaysInput = await screen.findByLabelText('自定义延长天数');
    await user.type(customDaysInput, '0');
    await user.click(screen.getByRole('button', { name: '确认更新' }));

    expect(toast.error).toHaveBeenCalledWith('请输入有效的自定义天数（大于 0 的整数）');
    expect(AuthService.updateApiKey).not.toHaveBeenCalled();
  });
});
