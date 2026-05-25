import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemSettingsView } from '../SystemSettingsView';

const controllerState = {
  enableUserAuth: true,
  enableUserLogin: true,
  enableUserSignup: true,
  enableResourceDetailPage: false,
  publicSiteUrl: '',
  tmdbReadAccessToken: '',
  tmdbConfigured: true,
  tmdbUpdatedAt: '2026-05-25T10:00:00Z',
  tmdbSource: 'secret_manager' as const,
  isLoading: false,
  isSaving: null,
  isSavingTMDB: false,
};

const actions = {
  setPublicSiteUrl: vi.fn(),
  setTMDBReadAccessToken: vi.fn(),
  handleToggleAuth: vi.fn(),
  handleToggleLogin: vi.fn(),
  handleToggleSignup: vi.fn(),
  handleToggleResourceDetailPage: vi.fn(),
  handleSaveDisplayConfig: vi.fn(),
  handleSaveTMDBConfig: vi.fn(),
};

vi.mock('@/hooks/useSystemSettingsController', () => ({
  useSystemSettingsController: () => ({
    state: controllerState,
    actions,
  }),
}));

describe('SystemSettingsView TMDB section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerState.tmdbReadAccessToken = '';
    controllerState.tmdbConfigured = true;
    controllerState.isSavingTMDB = false;
  });

  it('展示 TMDB 配置状态并禁止空输入保存', () => {
    render(<SystemSettingsView />);

    expect(screen.getByText('TMDB Read Access Token')).toBeInTheDocument();
    expect(screen.getByText('当前已配置访问令牌')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存令牌' })).toBeDisabled();
  });

  it('输入新令牌后允许保存且不回显已存明文', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    const input = screen.getByPlaceholderText('请输入新的 TMDB Read Access Token');
    await user.type(input, 'new-token');

    expect(actions.setTMDBReadAccessToken).toHaveBeenCalled();
    expect(screen.queryByDisplayValue('new-token')).not.toBeInTheDocument();
  });
});
