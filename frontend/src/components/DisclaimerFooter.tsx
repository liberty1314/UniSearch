import React from 'react';
import { Link } from 'react-router-dom';
import { BLUE_CYAN_LINK_ACCENT } from '@/lib/brandTheme';

const DisclaimerFooter: React.FC = () => {
  return (
    <footer className="relative overflow-hidden border-t border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-slate-950/55 backdrop-blur-nebula">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent dark:via-cyan-400/50`} />

      <div className="container mx-auto px-4 py-4 sm:py-5">
        <p className="text-center text-xs sm:text-sm leading-relaxed text-gray-500 dark:text-slate-400">
          <Link
            to="/disclaimer"
            className={`inline-flex items-center rounded-md px-1 py-0.5 font-medium text-gray-700 dark:text-slate-200 underline decoration-dotted underline-offset-4 decoration-gray-400/80 dark:decoration-slate-500/80 transition-all duration-200 ${BLUE_CYAN_LINK_ACCENT} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-slate-950`}
          >
            免责声明
          </Link>
        </p>
      </div>
    </footer>
  );
};

export default DisclaimerFooter;
