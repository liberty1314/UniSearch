import React from "react";
import { motion } from "framer-motion";
import { Layers, Sparkles, Activity } from "lucide-react";
import { useLocation } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import GradientText from "@/components/GradientText";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";

import { NumberTicker } from "@/components/ui/number-ticker";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import PlatformMarquee from "@/components/home/PlatformMarquee";
import TrendingCategories from "@/components/home/TrendingCategories";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";
import FeatureCard from "@/components/home/FeatureCard";

const HOME_ENTRANCE_SESSION_KEY = "unisearch_home_entrance_seen";

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
            className="mb-4 bg-gradient-to-r from-blue-950 via-cyan-600 to-sky-500 bg-clip-text text-2xl font-semibold tracking-tight text-transparent dark:from-blue-100 dark:via-cyan-300 dark:to-sky-200 sm:text-3xl"
          >
            智能网盘资源搜索引擎
          </motion.h2>

          <motion.p
            initial={shouldPlayHomeEntrance ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={heroDescriptionTransition}
            className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            快速找到您需要的文件，聚合多种主流网盘链接类型
          </motion.p>
        </motion.div>

        {/* 统计数字标签 - Glassmorphism 增强风格 */}
        <motion.div
          initial={shouldPlayHomeEntrance ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={statsTransition}
          className="flex items-center justify-center gap-4 sm:gap-6 mt-10 mb-[-0.5rem] flex-wrap relative z-20"
        >
          {[
            { value: 5, suffix: "+", label: "支持平台" },
            { value: 100, suffix: "w+", label: "资源索引" },
            { value: 99, suffix: "%", label: "搜索准确率" },
          ].map(({ value, suffix, label }) => (
            <div
              key={label}
              className="group glass-panel relative flex min-w-[124px] flex-col items-center gap-1.5 px-6 py-3 hover:-translate-y-1.5 hover:shadow-glass-strong dark:hover:shadow-glass-dark transition-all duration-300"
            >
              <p className="text-3xl font-extrabold text-slate-800 dark:text-white tabular-nums tracking-tight">
                <NumberTicker value={value} delay={0.9} />
                <span>{suffix}</span>
              </p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                {label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* 搜索区域 - 增强设计与间距紧凑化 */}
      <div className="w-full flex flex-col items-center mb-20 space-y-8 relative z-30">
        <motion.div
          initial={shouldPlayHomeEntrance ? { opacity: 0, y: 22 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={searchTransition}
          className="relative max-w-4xl w-full z-20"
        >
          <SearchBox className="w-full" />
        </motion.div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto">
        <div className="space-y-24 pb-28">
          {/* 功能特色 - 增强视觉设计 */}
          <div>
            <motion.div
              initial={shouldPlayHomeEntrance ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={sectionTransition}
              className="mb-16"
            >
              <HomeSectionHeader
                eyebrow="核心能力"
                title="为什么选择 UniSearch？"
                description="专业的网盘资源搜索平台，为您提供高效便捷的搜索体验"
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

            {/* 热门分类滚动轨道 */}
            <TrendingCategories shouldPlayEntrance={shouldPlayHomeEntrance} />

            {/* 支持识别/聚合能力收束条 */}
            <PlatformMarquee />
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
};

export default Home;
