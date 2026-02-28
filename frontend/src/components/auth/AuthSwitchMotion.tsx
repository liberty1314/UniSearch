import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AuthDirection } from './authRouteMotion';

export interface AuthSwitchMotionProps {
  children: React.ReactNode;
  routeKey: string;
  direction: AuthDirection;
  className?: string;
}

const enterEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const exitEase: [number, number, number, number] = [0.4, 0, 1, 1];

const AuthSwitchMotion: React.FC<AuthSwitchMotionProps> = ({
  children,
  routeKey,
  direction,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const shouldShowSheen = !prefersReducedMotion && direction !== 0;

  const enterX = direction === 0 ? 0 : direction * 24;
  const exitX = direction === 0 ? 0 : direction * -18;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        className={cn('relative auth-switch-stage', className)}
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, x: enterX, scale: 0.985, filter: 'blur(6px)' }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }
        }
        exit={
          prefersReducedMotion
            ? { opacity: 0, transition: { duration: 0.12, ease: exitEase } }
            : {
                opacity: 0,
                x: exitX,
                scale: 0.992,
                filter: 'blur(4px)',
                transition: { duration: 0.32, ease: exitEase },
              }
        }
        transition={{
          duration: prefersReducedMotion ? 0.12 : 0.45,
          ease: enterEase,
        }}
      >
        <motion.span
          aria-hidden
          className="auth-switch-sheen-track"
          initial={
            shouldShowSheen ? { opacity: 0, x: '-140%' } : { opacity: 0 }
          }
          animate={
            shouldShowSheen ? { opacity: [0, 1, 0], x: ['-140%', '160%'] } : { opacity: 0 }
          }
          transition={{
            duration: shouldShowSheen ? 0.52 : 0.12,
            ease: exitEase,
          }}
        >
          <span className="auth-switch-sheen" />
        </motion.span>
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthSwitchMotion;
