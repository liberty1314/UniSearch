interface ErrorLike {
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    data?: {
      error?: unknown;
    };
  };
}

function toErrorLike(error: unknown): ErrorLike | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  return error as ErrorLike;
}

export function getErrorMessage(error: unknown, fallback: string = '未知错误'): string {
  const err = toErrorLike(error);
  if (err && typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  const err = toErrorLike(error);
  if (!err || typeof err.response?.status !== 'number') {
    return undefined;
  }
  return err.response.status;
}

export function getErrorDataError(error: unknown): string | undefined {
  const err = toErrorLike(error);
  if (!err || typeof err.response?.data?.error !== 'string') {
    return undefined;
  }
  return err.response.data.error;
}

export function getErrorCode(error: unknown): number | undefined {
  const err = toErrorLike(error);
  if (!err || typeof err.code !== 'number') {
    return undefined;
  }
  return err.code;
}
