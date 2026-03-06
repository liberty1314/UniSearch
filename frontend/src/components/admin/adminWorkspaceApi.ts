import { toast } from 'sonner';

interface BatchLikeResult {
  success_count?: number;
  failed_count?: number;
  failed?: Array<{ error?: string }>;
}

type AuthorizedRequestOptions = Omit<RequestInit, 'headers' | 'body'> & {
  body?: unknown;
  includeJson?: boolean;
};

const isBodyInit = (value: unknown): value is BodyInit =>
  typeof value === 'string' ||
  value instanceof Blob ||
  value instanceof FormData ||
  value instanceof URLSearchParams ||
  value instanceof ArrayBuffer ||
  ArrayBuffer.isView(value) ||
  value instanceof ReadableStream;

export const buildAuthHeaders = (token: string, includeJson = false): HeadersInit => {
  if (includeJson) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const readErrorMessage = async (
  response: Response,
  fallbackMessage: string
): Promise<string> => {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    const message = data?.error || data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {
    // ignore parse error
  }
  return fallbackMessage;
};

export const getRequestErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallbackMessage;
};

export const requestAuthed = async (
  url: string,
  token: string,
  fallbackMessage: string,
  options: AuthorizedRequestOptions = {}
): Promise<Response> => {
  const { body, includeJson, ...rest } = options;
  const shouldUseJson =
    includeJson ?? (body !== undefined && !isBodyInit(body));
  const requestBody: BodyInit | undefined =
    body === undefined ? undefined : isBodyInit(body) ? body : JSON.stringify(body);

  const response = await fetch(url, {
    ...rest,
    headers: buildAuthHeaders(token, shouldUseJson),
    body: requestBody,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }

  return response;
};

export const requestAuthedJson = async <T>(
  url: string,
  token: string,
  fallbackMessage: string,
  options: AuthorizedRequestOptions = {}
): Promise<T> => {
  const response = await requestAuthed(url, token, fallbackMessage, options);
  return (await response.json()) as T;
};

export const toastBatchResult = (
  actionText: string,
  result: BatchLikeResult,
  itemLabel = '项'
): void => {
  const successCount = result.success_count ?? 0;
  const failedCount = result.failed_count ?? 0;

  if (failedCount > 0) {
    toast.warning(`${actionText}完成：成功 ${successCount} ${itemLabel}，失败 ${failedCount} ${itemLabel}`, {
      description: result.failed?.[0]?.error || undefined,
    });
    return;
  }

  toast.success(`${actionText}成功：${successCount} ${itemLabel}`);
};
