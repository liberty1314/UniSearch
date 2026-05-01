import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PasswordModal from '@/components/PasswordModal';
import { CloudType } from '@/types/api';

describe('PasswordModal', () => {
  it('renders through the shared dialog shell and keeps password actions', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    const onClose = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <PasswordModal
        isOpen
        onClose={onClose}
        password="1234"
        url="https://example.com/file"
        cloudType={CloudType.QUARK}
      />
    );

    expect(screen.getByRole('dialog', { name: '访问码提示夸克网盘' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '复制访问码' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1234');

    const openedWindow = { opener: null };
    openSpy.mockReturnValue(openedWindow as Window);

    fireEvent.click(screen.getByRole('button', { name: '打开链接' }));
    expect(openSpy).toHaveBeenCalledWith('https://example.com/file', '_blank');
    expect(onClose).toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
