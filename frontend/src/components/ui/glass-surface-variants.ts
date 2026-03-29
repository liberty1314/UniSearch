import { cva, type VariantProps } from 'class-variance-authority';

export const glassSurfaceFrostVariants: Record<'panel' | 'toolbar' | 'search' | 'popover', string> = {
  panel:
    'bg-gradient-to-br from-white/62 via-white/24 to-cyan-100/18 dark:from-[#0f1a2b]/76 dark:via-[#08111f]/52 dark:to-[#020617]/84',
  toolbar:
    'bg-gradient-to-br from-white/56 via-white/16 to-cyan-100/12 dark:from-[#0f1726]/74 dark:via-[#091220]/48 dark:to-[#020617]/82',
  search: '',
  popover: '',
};

export const glassSurfaceVariants = cva(
  [
    'relative isolate overflow-hidden',
    'border ring-1',
    'backdrop-blur-2xl backdrop-saturate-150',
    'transition-all duration-300',
  ],
  {
    variants: {
      variant: {
        panel:
          'rounded-3xl bg-white/80 border-slate-200/80 ring-white/70 shadow-[0_24px_56px_rgba(15,23,42,0.08)] dark:bg-[#060d18]/82 dark:border-slate-800/80 dark:ring-transparent dark:shadow-[0_34px_80px_rgba(2,6,23,0.52),inset_0_1px_0_rgba(148,163,184,0.08),inset_0_-24px_48px_rgba(8,47,73,0.18)]',
        toolbar:
          'rounded-2xl bg-white/48 border-slate-200/80 ring-white/70 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:bg-[#060d18]/84 dark:border-slate-800/80 dark:ring-transparent dark:shadow-[0_26px_64px_rgba(2,6,23,0.44),inset_0_1px_0_rgba(148,163,184,0.08),inset_0_-18px_36px_rgba(8,47,73,0.14)]',
        search:
          'rounded-[1.75rem] bg-white/82 border-slate-200/85 ring-white/75 shadow-[0_22px_52px_rgba(15,23,42,0.08)] dark:bg-[#07101b]/86 dark:border-slate-800/85 dark:ring-transparent dark:shadow-[0_30px_74px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(148,163,184,0.08),inset_0_-24px_42px_rgba(8,47,73,0.2)]',
        popover:
          'rounded-[22px] bg-white/78 border-slate-200/75 ring-white/70 shadow-[0_18px_48px_rgba(15,23,42,0.12)] dark:bg-[#07101d]/92 dark:border-slate-800/80 dark:ring-transparent dark:shadow-[0_34px_84px_rgba(2,6,23,0.62),inset_0_1px_0_rgba(148,163,184,0.08),inset_0_-20px_38px_rgba(8,47,73,0.18)]',
      },
      interactive: {
        true: 'hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(14,165,233,0.14)] dark:hover:border-slate-700/85 dark:hover:shadow-[0_36px_78px_rgba(8,145,178,0.24),inset_0_1px_0_rgba(186,230,253,0.10)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'panel',
      interactive: false,
    },
  }
);

export type GlassSurfaceVariant = NonNullable<VariantProps<typeof glassSurfaceVariants>['variant']>;
