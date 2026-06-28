interface ErrorLike {
  code?: unknown;
  message?: unknown;
  data?: {
    error?: unknown;
    code?: unknown;
    error_code?: unknown;
  };
  response?: {
    status?: unknown;
    data?: {
      error?: unknown;
      code?: unknown;
      error_code?: unknown;
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
  if (err && typeof err.data?.error === 'string' && err.data.error.trim()) {
    return err.data.error;
  }
  if (err && typeof err.response?.data?.error === 'string' && err.response.data.error.trim()) {
    return err.response.data.error;
  }
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  const err = toErrorLike(error);
  if (!err) {
    return undefined;
  }
  if (typeof err.response?.status === 'number') {
    return err.response.status;
  }
  if (typeof err.code !== 'number') {
    return undefined;
  }
  return err.code;
}

export function getErrorDataError(error: unknown): string | undefined {
  const err = toErrorLike(error);
  if (!err) {
    return undefined;
  }
  if (typeof err.data?.error === 'string') {
    return err.data.error;
  }
  if (typeof err.response?.data?.error !== 'string') {
    return undefined;
  }
  return err.response.data.error;
}

export function getErrorDataCode(error: unknown): string | undefined {
  const err = toErrorLike(error);
  if (!err) {
    return undefined;
  }
  if (typeof err.data?.error_code === 'string') {
    return err.data.error_code;
  }
  if (typeof err.response?.data?.error_code === 'string') {
    return err.response.data.error_code;
  }
  if (typeof err.data?.code === 'string') {
    return err.data.code;
  }
  if (typeof err.response?.data?.code === 'string') {
    return err.response.data.code;
  }
  return undefined;
}

export function getErrorCode(error: unknown): number | undefined {
  const err = toErrorLike(error);
  if (!err || typeof err.code !== 'number') {
    return undefined;
  }
  return err.code;
}
