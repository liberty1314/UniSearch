import React from "react";
import { motion } from "framer-motion";
import { Layers, Sparkles, Activity } from "lucide-react";
import { useLocation } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import GradientText from "@/components/GradientText";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import PlatformMarquee from "@/components/home/PlatformMarquee";
import TrendingCategories from "@/components/home/TrendingCategories";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";
import FeatureCard from "@/components/home/FeatureCard";
import { SearchService } from "@/services/searchService";

const HOME_ENTRANCE_SESSION_KEY = "unisearch_home_entrance_seen";

const trustSignals = [
  "支持 5+ 平台",
  "聚合识别主流链接类型",
  "持续更新资源索引",
] as const;

const usageSteps = [
  {
    title: "输入明确关键词",
    description: "优先输入资源名、课程名、软件名或主演名，减少无效搜索结果。",
  },
  {
    title: "优先使用分类入口",
    description: "不确定怎么搜时，先从热门分类和示例关键词快速进入结果页。",
  },
  {
    title: "进入详情页判断资源",
    description: "在详情页集中查看链接类型、提取信息与资源说明，再决定打开目标。",
  },
] as const;

const featureCards = [
  {
    title: "多平台搜索",
    description: "支持多种主流网盘链接类型识别与聚合搜索，一站式完成检索",
    Icon: Layers,
    iconGradient: "from-blue-500 via-sky-500 to-cyan-400",
    iconGlow:
      "shadow-[0_18px_32px_rgba(14,165,233,0.24)] group-hover:shadow-[0_22px_40px_rgba(14,165,233,0.28)]",
    accentText: "group-hover:text-blue-500",
  },
  {
    title: "智能匹配",
    description:
      "采用先进的搜索算法和AI技术，精准匹配您的搜索需求，提高搜索效率",
    Icon: Sparkles,
    iconGradient: "from-emerald-500 via-teal-500 to-green-400",
    iconGlow:
      "shadow-[0_18px_32px_rgba(16,185,129,0.24)] group-hover:shadow-[0_22px_40px_rgba(16,185,129,0.28)]",
    accentText: "group-hover:text-teal-500",
  },
  {
    title: "实时更新",
    description: "资源库实时更新维护，确保您获得最新最全的搜索结果和资源信息",
    Icon: Activity,
    iconGradient: "from-amber-500 via-orange-500 to-yellow-400",
    iconGlow:
      "shadow-[0_18px_32px_rgba(245,158,11,0.24)] group-hover:shadow-[0_22px_40px_rgba(245,158,11,0.28)]",
    accentText: "group-hover:text-amber-500",
  },
] as const;

const Home: React.FC = () => {
  useSearchAccessStatus();
  const location = useLocation();
  const skipHomeEntrance = Boolean(
    (location.state as { skipHomeEntrance?: boolean } | null)?.skipHomeEntrance,
  );
  const shouldResetHomeSearchBox = Boolean(
    (
      location.state as { resetHomeSearchBox?: boolean } | null
    )?.resetHomeSearchBox,
  );
  const [hasSeenHomeEntrance] = React.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return sessionStorage.getItem(HOME_ENTRANCE_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const shouldPlayHomeEntrance = !skipHomeEntrance && !hasSeenHomeEntrance;

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      sessionStorage.setItem(HOME_ENTRANCE_SESSION_KEY, "1");
    } catch {
      // 会话存储不可用时退化为当前页正常展示，不阻塞首页渲染。
    }

    const handleBeforeUnload = () => {
      try {
        sessionStorage.removeItem(HOME_ENTRANCE_SESSION_KEY);
      } catch {
        // 刷新前无法移除标记时，退化为本次会话内不重复播放，不影响页面卸载。
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const heroTransition = skipHomeEntrance
    ? { duration: 0.18, ease: "easeOut" as const }
    : { duration: 0.8, ease: "easeOut" as const };
  const heroChildTransition = skipHomeEntrance
    ? { duration: 0.18, ease: "easeOut" as const }
    : { delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const };
  const heroCopyTransition = skipHomeEntrance
    ? { duration: 0.18, ease: "easeOut" as const }
    : { delay: 0.4, duration: 0.6 };
  const heroDescriptionTransition = skipHomeEntrance
    ? { duration: 0.18, ease: "easeOut" as const }
    : { delay: 0.6, duration: 0.6 };
  const statsTransition = skipHomeEntrance
    ? { duration: 0.18, ease: "easeOut" as const }
    : { delay: 0.8, duration: 0.6 };
  const searchTransition = skipHomeEntrance
    ? { duration: 0.18, ease: "easeOut" as const }
    : { delay: 0.6, duration: 0.8, ease: "easeOut" as const };
  const sectionTransition = skipHomeEntrance
    ? { duration: 0.18, ease: "easeOut" as const }
    : { delay: 0.6, duration: 0.6 };

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
      <SEO />
      {/* 页面头部 - 增强品牌形象 */}
      <motion.div
        initial={shouldPlayHomeEntrance ? { opacity: 0, y: 24 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={heroTransition}
        className="text-center mb-20 relative z-10"
      >
        <motion.div
          initial={shouldPlayHomeEntrance ? { opacity: 0, scale: 0.985 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={heroChildTransition}
          className="mx-auto max-w-4xl"
        >
          <GradientText
            colors={["#3b82f6", "#0ea5e9", "#06b6d4"]}
            className="mb-6 text-5xl font-extrabold tracking-tight md:text-7xl"
          >
            UniSearch
          </GradientText>

          <motion.h2
            initial={shouldPlayHomeEntrance ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={heroCopyTransition}
            className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl md:text-4xl"
          >
            一个入口，聚合搜索主流网盘资源
          </motion.h2>

          <motion.p
            initial={shouldPlayHomeEntrance ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={heroDescriptionTransition}
            className="mx-auto max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg"
          >
            快速定位影视、课程、软件与资料资源，减少平台切换成本
          </motion.p>
        </motion.div>

        <motion.div
          initial={shouldPlayHomeEntrance ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={statsTransition}
          data-testid="home-trust-strip"
          className="relative z-20 mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400"
        >
          {trustSignals.map((signal) => (
            <div
              key={signal}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/65 px-4 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45"
            >
              <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(34,211,238,0.14)]" />
              <span className="font-medium">{signal}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <div className="relative z-30 mb-20 flex w-full flex-col items-center space-y-8">
        <motion.div
          initial={
            shouldPlayHomeEntrance && !shouldResetHomeSearchBox
              ? { opacity: 0, y: 22 }
              : false
          }
          animate={{ opacity: 1, y: 0 }}
          transition={searchTransition}
          className="relative z-20 w-full max-w-4xl"
        >
          <SearchBox className="w-full" />
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="space-y-24 pb-28">
          <div>
            <motion.div
              initial={shouldPlayHomeEntrance ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={sectionTransition}
              className="mb-16"
            >
              <HomeSectionHeader
                eyebrow="核心能力"
                title="帮你更快找到资源"
                description="把关键词、分类入口与平台覆盖说明放在同一条检索链路里，减少判断成本。"
              />
            </motion.div>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3 [perspective:1600px]">
              {featureCards.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  {...feature}
                  index={index}
                  shouldPlayEntrance={shouldPlayHomeEntrance}
                />
              ))}
            </div>

            <TrendingCategories shouldPlayEntrance={shouldPlayHomeEntrance} />

            <PlatformMarquee />

            <div className="mt-24">
              <HomeSectionHeader
                eyebrow="使用建议"
                title="如何更快找到想要的资源"
                description="先从明确关键词或分类入口进入，再通过详情页快速判断资源是否值得打开。"
                className="mb-10"
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {usageSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="glass-panel relative overflow-hidden p-6 text-left"
                  >
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(14,165,233,0.22)]">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300/85">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
};

export default Home;
