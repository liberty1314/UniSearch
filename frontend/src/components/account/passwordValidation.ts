interface PasswordValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  // 密码复杂度：大写/小写/数字/符号中至少满足几类（与后端 AUTH_PASSWORD_COMPLEXITY_CLASSES 对齐）。
  // 缺省（undefined）时跳过复杂度校验，保持调用方向后兼容。
  complexityClasses?: number;
}

export const ACCOUNT_PASSWORD_MIN_LENGTH = 6;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 64;
// bcrypt 只对前 72 字节做哈希，后端以此为硬上限；此处用于前端预检，避免超长密码提交后被拒。
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_WHITESPACE_PATTERN = /\s/u;
export const PASSWORD_ALL_WHITESPACE_PATTERN = /\s/gu;

// 前端弱口令黑名单：与后端 builtinWeakPasswords 保持一致（小写归一化后比对）。
// 后端可通过 AUTH_PASSWORD_BLOCKLIST_PATH 扩展，前端无法感知那部分，仅覆盖内置项，
// 剩余弱口令仍由后端兜底——前端校验只是体验优化，后端才是权威。
const BUILTIN_WEAK_PASSWORDS = new Set<string>([
  '123456', '123456789', '12345678', 'password', '111111', '123123',
  '000000', 'qwerty', 'qwerty123', 'abc123', 'password1', '1234567890',
  'iloveyou', 'admin', 'admin123', 'root', '666666', '888888',
  'letmein', 'welcome', 'monkey', '1q2w3e4r', 'passw0rd', 'zaq12wsx',
]);

// isWeakPassword 判断密码是否命中内置弱口令黑名单（小写归一化比对，与后端一致）。
export const isWeakPassword = (password: string): boolean =>
  BUILTIN_WEAK_PASSWORDS.has(password.toLowerCase());

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
    complexityClasses,
  }: PasswordValidationOptions = {}
): string | undefined => {
  if (!password) {
    return required ? '请输入新密码' : undefined;
  }

  // 校验顺序与后端 ValidateNewPassword 对齐：空格 → 长度 → 72字节 → 复杂度 → 弱口令。
  if (hasPasswordWhitespace(password)) {
    return '密码不能包含空格';
  }

  // 长度按 UTF-8 字节数判断，与后端 len(password) 语义一致（中文每字符 3 字节）。
  const byteLength = passwordByteLength(password);
  if (byteLength < minLength) {
    return `密码长度至少为 ${minLength} 个字符`;
  }

  if (byteLength > maxLength) {
    return `密码长度不能超过 ${maxLength} 个字符`;
  }

  if (byteLength > PASSWORD_MAX_BYTES) {
    return `密码长度不能超过 ${PASSWORD_MAX_BYTES} 字节（含多字节字符）`;
  }

  if (complexityClasses !== undefined && complexityClasses >= 1) {
    if (countPasswordClasses(password) < complexityClasses) {
      return `密码必须包含大写字母、小写字母、数字、符号中的至少 ${complexityClasses} 类`;
    }
  }

  if (isWeakPassword(password)) {
    return '密码过于简单，请勿使用常见弱口令';
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
