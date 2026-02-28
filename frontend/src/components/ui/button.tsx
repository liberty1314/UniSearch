/**
 * 兼容层：重新导出 AppleButton 作为 Button
 * 这个文件用于向后兼容，所有新代码应直接使用 AppleButton
 */
export { AppleButton as Button } from './AppleButton';
export type { AppleButtonProps as ButtonProps } from './AppleButton';
