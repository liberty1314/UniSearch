import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { resolveRouteTransition } from '@/routes/routeTransition';

interface PageTransitionProps {
    children: React.ReactNode;
}

/**
 * 页面切换过渡动画组件
 * 提供流畅的页面切换效果
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    const location = useLocation();
    const shouldReduceMotion = useReducedMotion();
    const previousPathRef = React.useRef(location.pathname);
    const previousPath = previousPathRef.current;
    const transitionMeta = resolveRouteTransition({
        from: previousPath,
        to: location.pathname,
        state: location.state,
    });

    React.useEffect(() => {
        previousPathRef.current = location.pathname;
    }, [location.pathname]);

    if (transitionMeta.shouldBypass) {
        return <>{children}</>;
    }

    const pageVariants = {
        initial: shouldReduceMotion
            ? { opacity: 0 }
            : transitionMeta.animation === 'shared-axis'
              ? {
                    opacity: 0,
                    x: transitionMeta.direction * 18,
                    scale: 0.992,
                    filter: 'blur(4px)',
                }
              : { opacity: 0.98 },
        animate: shouldReduceMotion
            ? { opacity: 1 }
            : transitionMeta.animation === 'shared-axis'
              ? { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }
              : { opacity: 1 },
        exit: shouldReduceMotion
            ? { opacity: 0 }
            : transitionMeta.animation === 'shared-axis'
              ? {
                    opacity: 0,
                    x: transitionMeta.direction * -14,
                    scale: 0.996,
                    filter: 'blur(3px)',
                }
              : { opacity: 0.98 },
    };

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={location.pathname}
                className="w-full"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{
                    duration: shouldReduceMotion
                        ? 0.12
                        : transitionMeta.animation === 'shared-axis'
                          ? 0.28
                          : 0.12,
                    ease:
                        transitionMeta.animation === 'shared-axis'
                            ? [0.22, 1, 0.36, 1]
                            : 'linear',
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default PageTransition;
