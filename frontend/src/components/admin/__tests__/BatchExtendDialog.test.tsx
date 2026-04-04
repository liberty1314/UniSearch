import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { BatchExtendDialog } from '../BatchExtendDialog';

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

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }) => (open ? (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      <button onClick={onConfirm}>确认最终延长</button>
    </div>
  ) : null),
}));

describe('BatchExtendDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthService, 'batchExtendApiKeys').mockResolvedValue({
      success_count: 2,
      failed_count: 0,
      results: [],
    });
  });

  it('requires selecting extension days before opening confirmation', async () => {
    const user = userEvent.setup();

    render(
      <BatchExtendDialog
        open
        onOpenChange={vi.fn()}
        selectedKeys={['key-1']}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '确认延长' }));

    expect(toast.error).toHaveBeenCalledWith('请选择要延长的天数');
    expect(AuthService.batchExtendApiKeys).not.toHaveBeenCalled();
  });

  it('converts preset day selection to hours for batch extension', async () => {
    const user = userEvent.setup();

    render(
      <BatchExtendDialog
        open
        onOpenChange={vi.fn()}
        selectedKeys={['key-1', 'key-2']}
        onSuccess={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByRole('combobox', { name: '批量延长天数' }), '7');
    await user.click(screen.getByRole('button', { name: '确认延长' }));
    fireEvent.click(screen.getByText('确认最终延长'));

    await waitFor(() => {
      expect(AuthService.batchExtendApiKeys).toHaveBeenCalledWith(['key-1', 'key-2'], 168);
    });
  });

  it('uses custom day input and updates confirmation copy', async () => {
    const user = userEvent.setup();

    render(
      <BatchExtendDialog
        open
        onOpenChange={vi.fn()}
        selectedKeys={['key-1']}
        onSuccess={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByRole('combobox', { name: '批量延长天数' }), 'custom');

    const customDaysInput = await screen.findByLabelText('自定义延长天数');
    await user.type(customDaysInput, '15');
    await user.click(screen.getByRole('button', { name: '确认延长' }));

    expect(screen.getByText('您确定要为选中的 1 个 API Key 延长 15天 的有效期吗？已过期 Key 将从当前时间开始计算。')).toBeInTheDocument();

    fireEvent.click(screen.getByText('确认最终延长'));

    await waitFor(() => {
      expect(AuthService.batchExtendApiKeys).toHaveBeenCalledWith(['key-1'], 360);
    });
  });

  it('blocks invalid custom day input for batch extension', async () => {
    const user = userEvent.setup();

    render(
      <BatchExtendDialog
        open
        onOpenChange={vi.fn()}
        selectedKeys={['key-1']}
        onSuccess={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByRole('combobox', { name: '批量延长天数' }), 'custom');

    const customDaysInput = await screen.findByLabelText('自定义延长天数');
    await user.type(customDaysInput, '0');
    await user.click(screen.getByRole('button', { name: '确认延长' }));

    expect(toast.error).toHaveBeenCalledWith('请输入有效的自定义天数（大于 0 的整数）');
    expect(AuthService.batchExtendApiKeys).not.toHaveBeenCalled();
  });
});
