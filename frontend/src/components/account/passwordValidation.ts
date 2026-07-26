interface PasswordValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export const ACCOUNT_PASSWORD_MIN_LENGTH = 6;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 64;
// bcrypt 只对前 72 字节做哈希，后端以此为硬上限；此处用于前端预检，避免超长密码提交后被拒。
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_WHITESPACE_PATTERN = /\s/u;
export const PASSWORD_ALL_WHITESPACE_PATTERN = /\s/gu;

export const hasPasswordWhitespace = (password: string): boolean =>
  PASSWORD_WHITESPACE_PATTERN.test(password);

export const removePasswordWhitespace = (password: string): string =>
  password.replace(PASSWORD_ALL_WHITESPACE_PATTERN, '');

// passwordByteLength 计算密码的 UTF-8 字节数（与后端 len() 语义一致）。
export const passwordByteLength = (password: string): number =>
  new TextEncoder().encode(password).length;

/**
 * countPasswordClasses 统计密码包含的字符类别数：大写/小写/数字/符号。
 * 规则与后端 service.countPasswordClasses 对齐，确保前端强度提示与真实校验一致。
 */
export const countPasswordClasses = (password: string): number => {
  let hasUpper = false;
  let hasLower = false;
  let hasDigit = false;
  let hasSymbol = false;
  for (const char of password) {
    if (/[A-Z]/.test(char)) hasUpper = true;
    else if (/[a-z]/.test(char)) hasLower = true;
    else if (/[0-9]/.test(char)) hasDigit = true;
    else if (!/\s/u.test(char)) hasSymbol = true;
  }
  return [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
};

interface PasswordPolicyLike {
  passwordMinLength: number;
  passwordMaxLength: number;
  passwordComplexityClasses?: number;
}

/**
 * getPasswordPolicyHelperText 展示完整密码规则：长度 + 复杂度要求。
 * 提前告知复杂度，避免用户提交后才被后端以"复杂度不足/弱口令"拒绝。
 */
export const getPasswordPolicyHelperText = ({
  passwordMinLength,
  passwordMaxLength,
  passwordComplexityClasses,
}: PasswordPolicyLike): string => {
  const base = `密码长度需在 ${passwordMinLength}-${passwordMaxLength} 个字符之间`;
  const classes = passwordComplexityClasses ?? 0;
  if (classes >= 1) {
    return `${base}，且至少包含大写字母、小写字母、数字、符号中的 ${classes} 类`;
  }
  return base;
};

/**
 * evaluatePasswordStrength 依据后端真实规则评估强度，而非独立的一套算法。
 * 返回 0=不满足要求，1=达标，2=良好，3=强，用于给出与后端一致的展示。
 */
export const evaluatePasswordStrength = (
  password: string,
  policy: PasswordPolicyLike,
): 0 | 1 | 2 | 3 => {
  if (!password) return 0;
  const requiredClasses = policy.passwordComplexityClasses ?? 3;
  const classes = countPasswordClasses(password);
  // 未达后端最低要求（长度或复杂度不足）一律视为不达标。
  if (
    password.length < policy.passwordMinLength ||
    passwordByteLength(password) > PASSWORD_MAX_BYTES ||
    classes < requiredClasses
  ) {
    return 0;
  }
  // 达标基础上，按额外长度与类别给出良好/强。
  let score: 1 | 2 | 3 = 1;
  if (password.length >= 12 && classes >= 3) score = 3;
  else if (password.length >= 10 || classes >= 3) score = 2;
  return score;
};

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
