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
      <div className="relative bg-white/60 backdrop-blur-2xl dark:bg-slate-950/80 transition-colors duration-500">
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
