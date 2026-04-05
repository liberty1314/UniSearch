interface PasswordValidationOptions {
  required?: boolean;
}

export const ACCOUNT_PASSWORD_MIN_LENGTH = 6;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 64;

export const validateAccountPassword = (
  password: string,
  { required = false }: PasswordValidationOptions = {}
): string | undefined => {
  if (!password) {
    return required ? '请输入新密码' : undefined;
  }

  if (password.length < ACCOUNT_PASSWORD_MIN_LENGTH) {
    return `密码长度至少为 ${ACCOUNT_PASSWORD_MIN_LENGTH} 个字符`;
  }

  if (password.length > ACCOUNT_PASSWORD_MAX_LENGTH) {
    return `密码长度不能超过 ${ACCOUNT_PASSWORD_MAX_LENGTH} 个字符`;
  }

  return undefined;
};

export const validateAccountPasswordConfirmation = (
  confirmation: string,
  password: string,
  { required = false }: PasswordValidationOptions = {}
): string | undefined => {
  if (!confirmation) {
    return required ? '请确认新密码' : undefined;
  }

  if (confirmation !== password) {
    return '两次输入的密码不一致';
  }

  return undefined;
};
