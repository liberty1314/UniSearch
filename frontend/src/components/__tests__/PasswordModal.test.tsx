import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PasswordModal from '@/components/PasswordModal';
import { CloudType } from "@/types/search";
import { SearchService } from '@/services/searchService';

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/services/searchService', () => ({
  SearchService: {
    refreshScanTransfer: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('PasswordModal', () => {
  beforeEach(() => {
    vi.mocked(SearchService.refreshScanTransfer).mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('renders through the shared dialog shell and keeps password actions', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    const onClose = vi.fn();

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

    const openLink = screen.getByRole('link', { name: '打开链接' });
    expect(openLink).toHaveAttribute('href', 'https://example.com/file');
    expect(openLink).toHaveAttribute('target', '_blank');
    expect(openLink).toHaveAttribute('rel', 'noopener noreferrer');

    fireEvent.click(openLink);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders magnet mode without password field and supports copy/open', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    const onClose = vi.fn();

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

    const openMagnetLink = screen.getByRole('link', { name: '打开磁力' });
    expect(openMagnetLink).toHaveAttribute('href', 'magnet:?xt=urn:btih:testhash');
    expect(openMagnetLink).toHaveAttribute('target', '_blank');
    expect(openMagnetLink).toHaveAttribute('rel', 'noopener noreferrer');

    fireEvent.click(openMagnetLink);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders scan transfer mode and supports refreshing the current qr code', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    vi.mocked(SearchService.refreshScanTransfer).mockResolvedValue({
      resource_id: 'seedhub-scan-1',
      link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
      access_mode: 'scan_transfer',
      scan_transfer: {
        qr_code_base64: 'data:image/png;base64,new456',
        transfer_code: 'NEW1234',
        instruction: '请使用手机扫码转存',
        refreshable: true,
        refresh_key: 'seedhub:4259:quark:1',
      },
    });

    render(
      <PasswordModal
        isOpen
        onClose={vi.fn()}
        password=""
        url="https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
        cloudType={CloudType.QUARK}
        resourceId="seedhub-scan-1"
        accessMode="scan_transfer"
        scanTransfer={{
          qr_code_base64: 'data:image/png;base64,abc123',
          transfer_code: 'ABCD1234',
          instruction: '请使用手机扫码转存',
          refreshable: true,
          refresh_key: 'seedhub:4259:quark:1',
        }}
      />
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('扫码转存');
    expect(screen.getByAltText('扫码转存二维码')).toHaveAttribute(
      'src',
      'data:image/png;base64,abc123',
    );
    expect(screen.queryByLabelText('原始链接')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '打开原始链接' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开链接' })).toHaveAttribute(
      'href',
      'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
    );

    fireEvent.click(screen.getByRole('button', { name: '重新获取二维码' }));

    await waitFor(() =>
      expect(SearchService.refreshScanTransfer).toHaveBeenCalledWith({
        resource_id: 'seedhub-scan-1',
        link_url: 'https://www.seedhub.cc/link_start/?redirect_to=quark_scan',
        refresh_key: 'seedhub:4259:quark:1',
      }),
    );

    await waitFor(() =>
      expect(screen.getByAltText('扫码转存二维码')).toHaveAttribute(
        'src',
        'data:image/png;base64,new456',
      ),
    );
    expect(screen.getByDisplayValue('NEW1234')).toBeInTheDocument();
  });

  it('uses qr_code_value to render a qr image when no qr image url is returned', () => {
    render(
      <PasswordModal
        isOpen
        onClose={vi.fn()}
        password=""
        url="https://sidhub.cc/link_start/?redirect_to=pan_id_626957"
        cloudType={CloudType.QUARK}
        resourceId="seedhub-scan-1"
        accessMode="scan_transfer"
        scanTransfer={{
          qr_code_value: 'https://pan.quark.cn/s/46300ad81d60',
          instruction: '这是一段很长的上游说明，不应该直接显示在二维码上方。',
          refreshable: true,
          refresh_key: 'seedhub:135689:quark:10',
        }}
      />
    );

    expect(screen.getByText('使用手机网盘 App 扫码转存。')).toBeInTheDocument();
    expect(screen.queryByText('这是一段很长的上游说明，不应该直接显示在二维码上方。')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '扫码转存二维码' })).toBeInTheDocument();
    expect(screen.queryByText('当前资源暂未返回二维码图片，可继续使用下方口令或手机深链完成转存。')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('https://pan.quark.cn/s/46300ad81d60')).toBeInTheDocument();
    expect(screen.queryByLabelText('原始链接')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '打开原始链接' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '打开转存页面' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开链接' })).toHaveAttribute(
      'href',
      'https://pan.quark.cn/s/46300ad81d60',
    );
  });

  it('shows an inline toast message when refreshing the qr code fails', async () => {
    vi.mocked(SearchService.refreshScanTransfer).mockRejectedValue(
      new Error('二维码服务繁忙'),
    );

    render(
      <PasswordModal
        isOpen
        onClose={vi.fn()}
        password=""
        url="https://www.seedhub.cc/link_start/?redirect_to=quark_scan"
        cloudType={CloudType.QUARK}
        resourceId="seedhub-scan-1"
        accessMode="scan_transfer"
        scanTransfer={{
          qr_code_base64: 'data:image/png;base64,abc123',
          transfer_code: 'ABCD1234',
          instruction: '请使用手机扫码转存',
          refreshable: true,
          refresh_key: 'seedhub:4259:quark:1',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '重新获取二维码' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('二维码服务繁忙');
    });
    expect(screen.getByAltText('扫码转存二维码')).toHaveAttribute(
      'src',
      'data:image/png;base64,abc123',
    );
  });
});
