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
  tmdbCurrentTokenPreview: 'tmdb-token-preview',
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
    controllerState.tmdbCurrentTokenPreview = 'tmdb-token-preview';
    controllerState.isSavingTMDB = false;
  });

  it('展示单输入框令牌配置并允许查看当前令牌', () => {
    render(<SystemSettingsView />);

    expect(screen.getByText('TMDB Read Access Token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看 TMDB 令牌' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存 TMDB 令牌' })).toBeDisabled();
  });

  it('支持在单输入框中查看并编辑令牌', async () => {
    const user = userEvent.setup();
    render(<SystemSettingsView />);

    const input = screen.getByPlaceholderText('请输入 TMDB Read Access Token');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: '查看 TMDB 令牌' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByDisplayValue('tmdb-token-preview')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'new-token');

    expect(actions.setTMDBReadAccessToken).toHaveBeenCalled();
    expect(actions.setTMDBReadAccessToken).toHaveBeenLastCalledWith('new-token');
    expect(screen.getByRole('button', { name: '保存 TMDB 令牌' })).toBeEnabled();
  });
});
