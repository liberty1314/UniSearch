export const shouldShowDisclaimer = (pathname: string): boolean => {
  return !pathname.startsWith('/admin');
};
