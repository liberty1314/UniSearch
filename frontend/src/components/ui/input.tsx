/**
 * 统一输入入口：内部复用 AppleInput，业务代码优先从本文件导入 Input。
 * 需要 label、error、helperText 等完整表单能力时，可直接使用 AppleInput。
 */
import React, { forwardRef } from 'react';
import { AppleInput, AppleInputProps } from './AppleInput';

export type InputProps = Omit<AppleInputProps, 'label' | 'error' | 'helperText'>;

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <AppleInput ref={ref} {...props} />;
});

Input.displayName = 'Input';
