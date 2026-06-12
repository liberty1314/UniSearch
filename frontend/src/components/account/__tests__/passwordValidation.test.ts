import { describe, expect, it } from 'vitest';
import {
  validateAccountPassword,
  validateAccountPasswordConfirmation,
} from '@/components/account/passwordValidation';

describe('account password validation', () => {
  it('treats an empty password as invalid when the field is required', () => {
    expect(validateAccountPassword('', { required: true })).toBe('请输入新密码');
  });

  it('rejects passwords shorter than 6 characters', () => {
    expect(validateAccountPassword('12345', { required: true })).toBe('密码长度至少为 6 个字符');
  });

  it('rejects passwords longer than 64 characters', () => {
    expect(validateAccountPassword('a'.repeat(65), { required: true })).toBe('密码长度不能超过 64 个字符');
  });

  it('rejects a confirmation value that does not match', () => {
    expect(validateAccountPasswordConfirmation('different', 'correct', { required: true })).toBe(
      '两次输入的密码不一致'
    );
  });

  it('accepts a valid password and matching confirmation', () => {
    expect(validateAccountPassword('correct-password', { required: true })).toBeUndefined();
    expect(
      validateAccountPasswordConfirmation('correct-password', 'correct-password', { required: true })
    ).toBeUndefined();
  });

  it('supports custom password length policies', () => {
    expect(validateAccountPassword('1234567', { required: true, minLength: 8, maxLength: 20 })).toBe(
      '密码长度至少为 8 个字符'
    );
    expect(validateAccountPassword('a'.repeat(21), { required: true, minLength: 8, maxLength: 20 })).toBe(
      '密码长度不能超过 20 个字符'
    );
  });
});
