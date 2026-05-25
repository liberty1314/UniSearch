export const shouldUseLazyRouteFallback = (path: string) =>
  path !== "/" && path !== "/search" && path !== "/hot";
