import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Eye, User } from 'lucide-react';
import AuthInput from '@/components/auth/AuthInput';

describe('AuthInput', () => {
  it('renders themed focus classes, helper text, and the left icon slot', () => {
    render(
      <AuthInput
        label="用户名"
        tone="emerald"
        icon={<User data-testid="auth-input-icon" className="h-4 w-4" />}
        placeholder="请输入用户名"
        helperText="用户名长度必须在 3-32 字符之间"
      />
    );

    const input = screen.getByLabelText('用户名');
    const icon = screen.getByTestId('auth-input-icon');
    const iconWrapper = icon.parentElement;

    expect(input).toHaveClass('focus:border-emerald-500');
    expect(input).toHaveClass('focus:ring-emerald-500/20');
    expect(icon).toBeInTheDocument();
    expect(iconWrapper).toHaveClass('z-10');
    expect(iconWrapper).toHaveClass('text-emerald-600');
  });

  it('renders inline errors and the right adornment slot', () => {
    render(
      <AuthInput
        label="密码"
        tone="rose"
        icon={<User className="h-4 w-4" />}
        placeholder="请输入密码"
        error="两次输入的密码不一致"
        endAdornment={(
          <button type="button" aria-label="显示密码">
            <Eye className="h-4 w-4" />
          </button>
        )}
      />
    );

    const input = screen.getByLabelText('密码');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('focus:border-red-500');
    expect(input).toHaveClass('focus:ring-red-500/20');
    expect(screen.getByRole('alert')).toHaveTextContent('两次输入的密码不一致');
    expect(screen.getByRole('button', { name: '显示密码' })).toBeInTheDocument();
  });
});
