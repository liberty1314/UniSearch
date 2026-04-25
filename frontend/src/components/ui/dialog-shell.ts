export const dialogShellViewportClassName =
  "fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 lg:p-10";

export const dialogShellOverlayClassName =
  "modal-shell-overlay fixed inset-0 z-[70] bg-white/34 backdrop-blur-[9px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-slate-950/42";

export const dialogShellPanelClassName =
  "modal-shell-surface relative z-10 rounded-[2.25rem] border-[0.5px] border-white/75 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.08),0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 dark:shadow-[0_24px_60px_rgba(2,6,23,0.45)]";

export const dialogShellContentClassName =
  `${dialogShellPanelClassName} fixed left-[50%] top-[50%] z-[71] grid max-h-[calc(100vh-4rem)] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-auto p-6 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.99] data-[state=open]:zoom-in-[0.99] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[49%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[49%] sm:p-7 lg:p-8`;

export const dialogShellCloseClassName =
  "modal-shell-close absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-slate-200/70 bg-white/70 text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100 dark:focus-visible:ring-cyan-700/70 dark:focus-visible:ring-offset-slate-950";

export const dialogShellHeaderClassName =
  "flex flex-col space-y-1.5 text-center sm:text-left";

export const dialogShellFooterClassName =
  "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2";

export const dialogShellTitleClassName =
  "text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100";

export const dialogShellDescriptionClassName =
  "text-sm text-slate-500 dark:text-slate-400";

export const dialogShellOverlayMotionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

export const getDialogShellSurfaceMotionProps = (shouldReduceMotion: boolean) =>
  shouldReduceMotion
    ? {
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 18, scale: 0.985, filter: 'blur(6px)' },
        animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, y: 14, scale: 0.99, filter: 'blur(4px)' },
        transition: { duration: 0.28, delay: 0.06, ease: [0.22, 1, 0.36, 1] as const },
      };
