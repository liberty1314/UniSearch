import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';

describe('CreateUserDialog', () => {
  it('toggles password visibility for both password fields', async () => {
    const user = userEvent.setup();

    render(
      <CreateUserDialog
        open
        onOpenChange={() => {}}
        onSuccess={() => {}}
      />
    );

    const passwordInput = screen.getByLabelText('密码') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('确认密码') as HTMLInputElement;

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: '显示密码' }));
    await user.click(screen.getByRole('button', { name: '显示确认密码' }));

    expect(passwordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: '隐藏密码' }));
    await user.click(screen.getByRole('button', { name: '隐藏确认密码' }));

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
  });
});
