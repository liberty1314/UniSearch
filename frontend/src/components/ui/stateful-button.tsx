"use client";

import React, { useImperativeHandle } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export interface StatefulButtonHandle {
  run: (fn?: () => void | Promise<void>) => Promise<void>;
  reset: () => void;
}

type ButtonStatus = "idle" | "loading" | "success";

const SUCCESS_FEEDBACK_DURATION_MS = 1200;

export const Button = React.forwardRef<StatefulButtonHandle, ButtonProps>(
  ({ className, children, disabled, onClick, ...buttonProps }, ref) => {
    const [status, setStatus] = React.useState<ButtonStatus>("idle");
    const runIdRef = React.useRef(0);
    const successTimeoutRef = React.useRef<number | null>(null);
    const mountedRef = React.useRef(true);

    const clearSuccessTimeout = React.useCallback(() => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    }, []);

    React.useEffect(() => {
      mountedRef.current = true;

      return () => {
        mountedRef.current = false;
        clearSuccessTimeout();
      };
    }, [clearSuccessTimeout]);

    const reset = React.useCallback(() => {
      runIdRef.current += 1;
      clearSuccessTimeout();
      if (mountedRef.current) {
        setStatus("idle");
      }
    }, [clearSuccessTimeout]);

    const run = React.useCallback(
      async (fn?: () => void | Promise<void>) => {
        const runId = runIdRef.current + 1;
        runIdRef.current = runId;
        clearSuccessTimeout();
        setStatus("loading");

        try {
          await fn?.();
        } catch (error) {
          if (mountedRef.current && runIdRef.current === runId) {
            setStatus("idle");
          }
          throw error;
        }

        if (!mountedRef.current || runIdRef.current !== runId) {
          return;
        }

        setStatus("success");
        successTimeoutRef.current = window.setTimeout(() => {
          if (mountedRef.current && runIdRef.current === runId) {
            setStatus("idle");
          }
        }, SUCCESS_FEEDBACK_DURATION_MS);
      },
      [clearSuccessTimeout],
    );

    useImperativeHandle(ref, () => ({ run, reset }), [run, reset]);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      await run(() => onClick?.(event));
    };

    const isLoading = status === "loading";

    return (
      <button
        className={cn(
          "flex min-w-[120px] cursor-pointer items-center justify-center gap-2 rounded-full bg-apple-blue px-4 py-2 font-medium text-white transition duration-200 hover:bg-apple-blue/90 disabled:cursor-not-allowed disabled:opacity-70",
          className,
        )}
        {...buttonProps}
        type={buttonProps.type ?? "button"}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        onClick={handleClick}
      >
        <span className="flex items-center gap-2">
          {status === "loading" ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {status === "success" ? (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
          ) : null}
          <span>{children}</span>
        </span>
      </button>
    );
  },
);

Button.displayName = "StatefulButton";
