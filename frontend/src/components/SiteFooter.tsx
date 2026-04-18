import React from 'react';
import { Footer } from '@/components/ui/footer';
import {
  BLUE_CYAN_DIVIDER_PRIMARY,
  BLUE_CYAN_DIVIDER_SECONDARY,
} from '@/lib/brandTheme';

const CURRENT_YEAR = new Date().getFullYear();
const CONTACT_EMAIL = 'UniSearch@163.com';

const SiteFooter: React.FC = () => {
  return (
    <footer className="relative w-full z-10">
      {/* 21st.dev 风格 - 动态渐变分隔线 */}
      <div className="relative h-px w-full overflow-hidden">
        <div className={`absolute inset-0 ${BLUE_CYAN_DIVIDER_PRIMARY} animate-shimmer`} />
        <div className={`absolute inset-0 ${BLUE_CYAN_DIVIDER_SECONDARY} animate-shimmer`} style={{ animationDelay: '0.75s' }} />
      </div>
      <div className="obsidian-glass-shell relative bg-white/20 backdrop-blur-3xl border-t border-white/40 shadow-[0_-8px_32px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors duration-500">
        <div className="container mx-auto">
          <Footer
            showHeader={true}
            logo={
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/30 dark:bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md">
                <img
                  src="/Uni.png"
                  alt="UniSearch"
                  className="h-6 w-6 object-contain drop-shadow-sm"
                />
              </div>
            }
            brandName="UniSearch"
            socialLinks={[]}
            mainLinks={[
              { href: '/', label: '首页' },
              { href: '/account', label: '个人中心' },
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
