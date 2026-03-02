import { toast } from 'sonner';

interface BatchLikeResult {
  success_count?: number;
  failed_count?: number;
  failed?: Array<{ error?: string }>;
}

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
