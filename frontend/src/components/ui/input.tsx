/**
 * 兼容层：重新导出 AppleInput 作为 Input
 * 这个文件用于向后兼容，所有新代码应直接使用 AppleInput
 */
import React, { forwardRef } from 'react';
import { AppleInput, AppleInputProps } from './AppleInput';

export type InputProps = Omit<AppleInputProps, 'label' | 'error' | 'helperText'>;

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <AppleInput ref={ref} {...props} />;
});

Input.displayName = 'Input';
