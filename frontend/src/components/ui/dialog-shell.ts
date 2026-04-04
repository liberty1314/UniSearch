export const dialogShellOverlayClassName =
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const dialogShellContentClassName =
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white/80 p-6 shadow-2xl backdrop-blur-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl border-nebula-200 dark:border-nebula-800 dark:bg-slate-900/80";

export const dialogShellHeaderClassName =
  "flex flex-col space-y-1.5 text-center sm:text-left";

export const dialogShellFooterClassName =
  "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2";

export const dialogShellTitleClassName =
  "text-lg font-semibold leading-none tracking-tight";

export const dialogShellDescriptionClassName =
  "text-sm text-muted-foreground";
