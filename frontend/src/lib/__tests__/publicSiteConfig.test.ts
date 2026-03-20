import { describe, expect, it } from 'vitest';
import {
  buildCopyFormatPreview,
  getCopyFormatTemplate,
  resolvePublicSiteUrl,
} from '@/lib/publicSiteConfig';

describe('publicSiteConfig', () => {
  it('prefers system settings over env defaults for public site url', () => {
    expect(
      resolvePublicSiteUrl(
        { public_site_url: 'https://settings.example.com' },
        'https://env.example.com'
      )
    ).toBe('https://settings.example.com/');
  });

  it('falls back to env defaults when system settings are empty', () => {
    expect(
      getCopyFormatTemplate(
        { default_copy_format_template: '' },
        '卡密：{key}，网址：https://env.example.com/'
      )
    ).toBe('卡密：{key}，网址：https://env.example.com/');
  });

  it('builds a preview string with the resolved site url when no template is configured', () => {
    expect(
      buildCopyFormatPreview(
        { public_site_url: 'https://settings.example.com' },
        'sk-123',
        ''
      )
    ).toContain('https://settings.example.com/');
  });
});
