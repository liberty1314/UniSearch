export interface PublicSiteConfigSource {
  public_site_url?: string | null;
  default_copy_format_template?: string | null;
}

const CODE_FALLBACK_SITE_URL = 'https://example.com/';

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function resolvePublicSiteUrl(
  settings?: PublicSiteConfigSource | null,
  envDefault = import.meta.env.VITE_PUBLIC_SITE_URL || CODE_FALLBACK_SITE_URL
): string {
  const fromSettings = normalizeUrl(settings?.public_site_url || '');
  if (fromSettings) {
    return fromSettings;
  }

  const fromEnv = normalizeUrl(envDefault || '');
  if (fromEnv) {
    return fromEnv;
  }

  return CODE_FALLBACK_SITE_URL;
}

export function getCopyFormatTemplate(
  settings?: PublicSiteConfigSource | null,
  envDefault = import.meta.env.VITE_DEFAULT_COPY_FORMAT_TEMPLATE || ''
): string {
  const fromSettings = (settings?.default_copy_format_template || '').trim();
  if (fromSettings) {
    return fromSettings;
  }

  const fromEnv = (envDefault || '').trim();
  if (fromEnv) {
    return fromEnv;
  }

  return `卡密：{key}，网址：${resolvePublicSiteUrl(settings, '')}`;
}

export function buildCopyFormatPreview(
  settings: PublicSiteConfigSource | null | undefined,
  keyPreview: string,
  envDefault = import.meta.env.VITE_DEFAULT_COPY_FORMAT_TEMPLATE || ''
): string {
  return getCopyFormatTemplate(settings, envDefault).replace(/{key}/g, keyPreview);
}
