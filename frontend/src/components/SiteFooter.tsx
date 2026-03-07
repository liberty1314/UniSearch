import React from 'react';
import { Footer } from '@/components/ui/footer';

const CURRENT_YEAR = new Date().getFullYear();
const CONTACT_EMAIL = 'UniSearch@163.com';

const SiteFooter: React.FC = () => {
  return (
    <footer className="relative w-full z-10">
      {/* 顶部柔和过渡区域 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-700 to-transparent opacity-60" />
      <div className="absolute inset-x-0 top-0 h-32 -translate-y-full bg-gradient-to-b from-transparent to-gray-50/50 dark:to-slate-950/80 pointer-events-none" />

      {/* 背景点缀光晕 */}
      <div className="absolute left-1/4 top-0 -translate-y-1/2 w-[30rem] h-24 bg-blue-500/10 dark:bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute right-1/4 top-0 -translate-y-1/2 w-[30rem] h-24 bg-purple-500/10 dark:bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative border-t border-gray-200/50 bg-white/60 backdrop-blur-2xl dark:border-white/[0.05] dark:bg-slate-950/80 transition-colors duration-500">
        <div className="container mx-auto">
          <Footer
            showHeader={false}
            logo={
              <div className="relative flex h-10 w-10 items-center justify-center">
                <img
                  src="/Uni.png"
                  alt="UniSearch"
                  className="h-8 w-8 object-contain"
                />
              </div>
            }
            brandName="UniSearch"
            socialLinks={[]}
            mainLinks={[
              { href: '/', label: '首页' },
              { href: '/settings/apikey', label: 'API Key 设置' },
              { href: '/disclaimer', label: '免责声明' },
            ]}
            legalLinks={[
              { href: `mailto:${CONTACT_EMAIL}`, label: '联系我们' },
            ]}
            copyright={{
              text: `© ${CURRENT_YEAR} UniSearch`,
              license: 'Search smarter. Access cleanly.',
            }}
          />
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
