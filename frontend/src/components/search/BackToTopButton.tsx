import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface BackToTopButtonProps {
  /** 滚动超过该像素值后显示按钮 */
  threshold?: number;
}

const BackToTopButton: React.FC<BackToTopButtonProps> = ({
  threshold = 600,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          aria-label="回到顶部"
          data-testid="search-back-to-top"
          className="fixed bottom-6 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors hover:text-blue-600 active:scale-90 dark:border-white/[0.08] dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-blue-400 sm:bottom-8 sm:right-8"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};

export default BackToTopButton;
