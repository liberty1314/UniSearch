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

  it('renders magnet mode without password field and supports copy/open', async () => {
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
        password=""
        url="magnet:?xt=urn:btih:testhash"
        cloudType="magnet"
      />
    );

    expect(screen.getByRole('dialog', { name: '磁力链接磁力链接' })).toBeInTheDocument();
    expect(screen.queryByLabelText('访问码')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('magnet:?xt=urn:btih:testhash')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '复制磁力链接' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('magnet:?xt=urn:btih:testhash');

    const openedWindow = { opener: null };
    openSpy.mockReturnValue(openedWindow as Window);

    fireEvent.click(screen.getByRole('button', { name: '打开磁力' }));
    expect(openSpy).toHaveBeenCalledWith('magnet:?xt=urn:btih:testhash', '_blank');
    expect(onClose).toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
