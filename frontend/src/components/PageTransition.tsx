import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { isAuthRoute } from '@/components/auth/authRouteMotion';

interface PageTransitionProps {
    children: React.ReactNode;
}

/**
 * 页面切换过渡动画组件
 * 提供流畅的页面切换效果
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    const location = useLocation();
    const previousPathRef = React.useRef(location.pathname);
    const previousPath = previousPathRef.current;
    const isCurrentAdminRoute = location.pathname.startsWith('/admin');
    const isPreviousAdminRoute = previousPath.startsWith('/admin');
    const isHomeSearchTransition =
        (previousPath === '/' || previousPath === '/search') &&
        (location.pathname === '/' || location.pathname === '/search');

    const isAuthToAuthTransition =
        previousPath !== location.pathname &&
        isAuthRoute(previousPath) &&
        isAuthRoute(location.pathname);

    React.useEffect(() => {
        previousPathRef.current = location.pathname;
    }, [location.pathname]);

    if (isCurrentAdminRoute || isPreviousAdminRoute || isHomeSearchTransition) {
        return <>{children}</>;
    }

    const pageVariants = {
        initial: isAuthToAuthTransition
            ? { opacity: 0.98 }
            : { opacity: 0 },
        animate: { opacity: 1 },
        exit: isAuthToAuthTransition
            ? { opacity: 0.98 }
            : { opacity: 0 },
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
                    duration: isAuthToAuthTransition ? 0.08 : 0.5,
                    ease: isAuthToAuthTransition ? 'linear' : [0.22, 1, 0.36, 1], // Custom cubic-bezier for "premium" feel
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default PageTransition;
