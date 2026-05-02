import React from 'react';

const CONTACT_EMAIL = 'UniSearch@163.com';

const DisclaimerPage: React.FC = () => {
  return (
    <div className="obsidian-shell min-h-screen bg-white">
      <div className="container mx-auto px-4 pt-24 pb-16 sm:pb-20">
        <article className="glass-card-premium relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200/70 dark:border-white/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-nebula-500/70 to-transparent dark:via-nebula-300/70" />

          <header className="px-6 sm:px-8 pt-7 sm:pt-9 pb-5 border-b border-gray-200/70 dark:border-white/10">
            <p className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-nebula-700 dark:text-nebula-300 bg-nebula-100/80 dark:bg-nebula-900/30 border border-nebula-200/80 dark:border-nebula-700/40">
              Legal Notice
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              免责声明
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-7 text-gray-600 dark:text-slate-300">
              为明确平台责任边界、版权归属及用户使用义务，请在使用 UniSearch 前完整阅读以下条款。
            </p>
          </header>

          <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-6 text-sm sm:text-base leading-7 text-gray-600 dark:text-slate-300">
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2">1. 服务性质与平台定位</h2>
              <p>
                本平台仅提供公开网络信息检索与索引服务，不存储、不上传、不分发任何第三方文件内容。平台仅作为信息聚合与跳转入口，不对第三方站点资源作实质性控制。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2">2. 第三方内容与版权归属</h2>
              <p>
                搜索结果中涉及的作品、文件、商标、名称及相关权益均归原权利人所有。平台不声明、转让或授权任何第三方内容的所有权、使用权或传播权。
              </p>
              <p className="mt-2">
                第三方平台名称、商标及标识归各自权利人所有。站内出现相关名称仅用于说明可识别、可聚合的链接类型或检索范围，不表示平台与相关权利人之间存在合作、授权、赞助或背书关系。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2">3. 用户合规义务</h2>
              <p>
                用户应自行判断内容合法性、真实性与安全性，并遵守所在地区的法律法规。禁止将平台用于侵权传播、非法下载、恶意攻击、批量爬取或其他违反法律与平台规则的行为。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2">4. 风险提示与责任限制</h2>
              <p>
                平台不对第三方资源的可用性、准确性、完整性、时效性或安全性作任何明示或默示担保。因访问、下载、使用第三方内容产生的损失、争议或法律风险，由用户自行承担。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2">5. 侵权通知与处理</h2>
              <p>
                如您认为检索结果中存在侵权或违规信息，请通过下述邮箱提交权利证明、侵权链接及说明材料。我们将在核实后尽快采取必要处理措施。
              </p>
              <p className="mt-2">
                联系方式：
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="ml-1 underline decoration-dotted underline-offset-2 text-nebula-600 dark:text-nebula-300 hover:text-nebula-700 dark:hover:text-nebula-200 transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2">6. 条款更新与生效</h2>
              <p>
                平台有权根据法律法规变化、业务调整或风险控制需求更新本免责声明。更新内容发布后即生效，继续使用平台即视为您已知悉并接受最新条款。
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
};

export default DisclaimerPage;
