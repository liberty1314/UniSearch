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
        },
        animate: {
            opacity: 1,
        },
        exit: {
            opacity: 0,
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                className="w-full"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for "premium" feel
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default PageTransition;
