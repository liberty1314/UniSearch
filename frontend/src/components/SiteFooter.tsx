import React from 'react';
import { Footer } from '@/components/ui/footer';

const CURRENT_YEAR = new Date().getFullYear();
const CONTACT_EMAIL = 'UniSearch@163.com';

const SiteFooter: React.FC = () => {
  return (
    <div className="border-t border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75">
      <div className="container mx-auto">
        <Footer
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
  );
};

export default SiteFooter;
