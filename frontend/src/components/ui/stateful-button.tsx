"use client";
import { cn } from "@/lib/utils";
import React, { useImperativeHandle } from "react";
import { motion, useAnimate } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export interface StatefulButtonHandle {
  run: (fn?: () => void | Promise<void>) => Promise<void>;
  reset: () => void;
}

export const Button = React.forwardRef<StatefulButtonHandle, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    const [scope, animate] = useAnimate();
    const cancelledRef = React.useRef(false);

    const animateLoading = React.useCallback(async () => {
      await animate(
        ".loader",
        {
          width: "20px",
          scale: 1,
          display: "block",
        },
        {
          duration: 0.2,
        },
      );
    }, [animate]);

    const animateSuccess = React.useCallback(async () => {
      await animate(
        ".loader",
        {
          width: "0px",
          scale: 0,
          display: "none",
        },
        {
          duration: 0.2,
        },
      );
      await animate(
        ".check",
        {
          width: "20px",
          scale: 1,
          display: "block",
        },
        {
          duration: 0.2,
        },
      );

      await animate(
        ".check",
        {
          width: "0px",
          scale: 0,
          display: "none",
        },
        {
          delay: 2,
          duration: 0.2,
        },
      );
    }, [animate]);

    const run = React.useCallback(
      async (fn?: () => void | Promise<void>) => {
        cancelledRef.current = false;
        await animateLoading();
        if (fn) {
          await fn();
        }
        if (cancelledRef.current) {
          // 如果在执行期间被重置，确保视觉状态回到初始
          await animate([
            [
              ".loader",
              { width: "0px", scale: 0, display: "none" },
              { duration: 0.01 },
            ],
            [
              ".check",
              { width: "0px", scale: 0, display: "none" },
              { duration: 0.01 },
            ],
          ]);
          return;
        }
        await animateSuccess();
      },
      [animateLoading, animateSuccess, animate],
    );

    const reset = React.useCallback(() => {
      cancelledRef.current = true;
      // 立即复位到初始状态
      animate([
        [
          ".loader",
          { width: "0px", scale: 0, display: "none" },
          { duration: 0.01 },
        ],
        [
          ".check",
          { width: "0px", scale: 0, display: "none" },
          { duration: 0.01 },
        ],
      ]);
    }, [animate]);

    useImperativeHandle(ref, () => ({ run, reset }), [run, reset]);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      await run(() => props.onClick?.(event));
    };

    const buttonProps = {
      ...props,
      onClick: undefined,
      onDrag: undefined,
      onDragStart: undefined,
      onDragEnd: undefined,
      onAnimationStart: undefined,
      onAnimationEnd: undefined,
    };

    return (
      <motion.button
        ref={scope}
        className={cn(
          "flex min-w-[120px] cursor-pointer items-center justify-center gap-2 rounded-full bg-apple-blue px-4 py-2 font-medium text-white transition duration-200 hover:bg-apple-blue/90",
          className,
        )}
        {...buttonProps}
        onClick={handleClick}
      >
        <motion.div className="flex items-center gap-2">
          <Loader />
          <CheckIcon />
          <motion.span>{children}</motion.span>
        </motion.div>
      </motion.button>
    );
  },
);

const Loader = () => {
  return (
    <motion.svg
      animate={{
        rotate: [0, 360],
      }}
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      transition={{
        duration: 0.3,
        repeat: Infinity,
        ease: "linear",
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="loader text-white hidden"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 3a9 9 0 1 0 9 9" />
    </motion.svg>
  );
};

const CheckIcon = () => {
  return (
    <motion.svg
      initial={{
        scale: 0,
        width: 0,
        display: "none",
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="check text-white hidden"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M9 12l2 2l4 -4" />
    </motion.svg>
  );
};
