interface PasswordValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export const ACCOUNT_PASSWORD_MIN_LENGTH = 6;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_WHITESPACE_PATTERN = /\s/u;
export const PASSWORD_ALL_WHITESPACE_PATTERN = /\s/gu;

export const hasPasswordWhitespace = (password: string): boolean =>
  PASSWORD_WHITESPACE_PATTERN.test(password);

export const removePasswordWhitespace = (password: string): string =>
  password.replace(PASSWORD_ALL_WHITESPACE_PATTERN, '');

export const getPasswordPolicyHelperText = ({
  passwordMinLength,
  passwordMaxLength,
}: {
  passwordMinLength: number;
  passwordMaxLength: number;
}): string => `密码长度需在 ${passwordMinLength}-${passwordMaxLength} 个字符之间`;

export const validateAccountPassword = (
  password: string,
  {
    required = false,
    minLength = ACCOUNT_PASSWORD_MIN_LENGTH,
    maxLength = ACCOUNT_PASSWORD_MAX_LENGTH,
  }: PasswordValidationOptions = {}
): string | undefined => {
  if (!password) {
    return required ? '请输入新密码' : undefined;
  }

  if (hasPasswordWhitespace(password)) {
    return '密码不能包含空格';
  }

  if (password.length < minLength) {
    return `密码长度至少为 ${minLength} 个字符`;
  }

  if (password.length > maxLength) {
    return `密码长度不能超过 ${maxLength} 个字符`;
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
