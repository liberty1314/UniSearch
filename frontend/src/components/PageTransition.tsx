import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
    children: React.ReactNode;
}

/**
 * 页面切换过渡动画组件
 * 提供流畅的页面切换效果
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    const location = useLocation();

    const pageVariants = {
        initial: {
            opacity: 0,
            y: 20,
            scale: 0.98,
        },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
        },
        exit: {
            opacity: 0,
            y: -20,
            scale: 0.98,
        },
    };

    const pageTransition = {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1] as const,
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default PageTransition;
