"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import {
  ArrowUp,
  FileText,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  gsap.registerPlugin(ScrollTrigger);
}

const CONTACT_EMAIL = "UniSearch@163.com";

type MagneticButtonProps = {
  as?: "a" | "button";
  href?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
};

const shouldReduceMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  (props, forwardedRef) => {
    const localRef = useRef<HTMLElement | null>(null);
    const { className, children } = props;

    const assignRefs = React.useCallback(
      (node: HTMLElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    useEffect(() => {
      if (typeof window === "undefined" || shouldReduceMotion()) return;

      const element = localRef.current;
      if (!element) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (event: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const x = event.clientX - rect.left - centerX;
          const y = event.clientY - rect.top - centerY;

          gsap.to(element, {
            x: x * 0.35,
            y: y * 0.35,
            rotationX: -y * 0.12,
            rotationY: x * 0.12,
            scale: 1.04,
            ease: "power2.out",
            duration: 0.4,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.2,
          });
        };

        element.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    if (props.as === "a") {
      return (
        <a
          ref={assignRefs as React.Ref<HTMLAnchorElement>}
          className={cn("cursor-pointer", className)}
          href={props.href}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={assignRefs as React.Ref<HTMLButtonElement>}
        className={cn("cursor-pointer", className)}
        type="button"
        onClick={props.onClick}
        aria-label={props["aria-label"]}
      >
        {children}
      </button>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

const MarqueeItem = () => (
  <div className="flex items-center space-x-10 px-5">
    <span>聚合搜索</span>
    <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-white/55" />
    <span>清晰访问</span>
    <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-blue-300/70" />
    <span>统一入口</span>
    <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-white/55" />
    <span>隐私优先</span>
    <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-blue-300/70" />
  </div>
);

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (typeof window === "undefined" || shouldReduceMotion()) return;
    if (!wrapperRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: "10vh", scale: 0.86, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 40%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative h-screen w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="cinematic-footer-wrapper obsidian-glass-shell fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#050505] via-[#101010] to-[#1d1d1f] text-slate-50 dark:text-slate-50">
          <div
            aria-hidden="true"
            className="footer-aurora animate-footer-breathe pointer-events-none absolute inset-0 z-0 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="footer-bg-grid pointer-events-none absolute inset-0 z-0"
          />

          <div
            ref={giantTextRef}
            aria-hidden="true"
            className="footer-giant-bg-text pointer-events-none absolute -bottom-4 left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap sm:-bottom-8 md:-bottom-12"
          >
            UNISEARCH
          </div>

          <div
            aria-hidden="true"
            className="footer-marquee-band absolute left-0 top-12 z-10 w-full -rotate-2 scale-110 overflow-hidden border-y py-4 shadow-2xl backdrop-blur-md"
          >
            <div className="animate-footer-scroll-marquee flex w-max text-xs font-bold uppercase md:text-sm">
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-lg border border-white/14 bg-[rgba(29,29,31,0.76)] shadow-[0_20px_48px_-24px_rgba(0,0,0,0.56)] backdrop-blur-md dark:border-white/10 dark:bg-[rgba(29,29,31,0.82)]">
              <img src="/Uni.png" alt="UniSearch" className="h-11 w-11 object-contain" />
            </div>

            <h2
              ref={headingRef}
              className="footer-text-glow mb-10 text-center text-4xl font-black sm:text-5xl md:text-7xl"
            >
              准备开始探索？
            </h2>

            <div ref={linksRef} className="flex w-full flex-col items-center gap-5">
              <div className="flex w-full flex-wrap justify-center gap-4">
                <MagneticButton
                  as="button"
                  onClick={scrollToTop}
                  aria-label="开始搜索"
                  className="footer-glass-pill footer-primary-pill group flex items-center gap-3 px-8 py-4 text-sm font-bold md:text-base"
                >
                  <Search aria-hidden="true" className="h-5 w-5 text-white/82 transition-colors group-hover:text-white" />
                  开始搜索
                </MagneticButton>

                <MagneticButton
                  as="a"
                  href="/account"
                  className="footer-glass-pill group flex items-center gap-3 px-8 py-4 text-sm font-bold md:text-base"
                >
                  <UserRound aria-hidden="true" className="h-5 w-5 text-blue-200/72 transition-colors group-hover:text-blue-100 dark:text-blue-200/72 dark:group-hover:text-white" />
                  个人中心
                </MagneticButton>
              </div>

              <div className="mt-1 flex w-full flex-wrap justify-center gap-3 md:gap-5">
                <MagneticButton
                  as="a"
                  href="/disclaimer"
                  className="footer-glass-pill footer-secondary-pill flex items-center gap-2 px-5 py-3 text-xs font-medium md:text-sm"
                >
                  <FileText aria-hidden="true" className="h-4 w-4" />
                  免责声明
                </MagneticButton>
                <MagneticButton
                  as="a"
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="footer-glass-pill footer-secondary-pill flex items-center gap-2 px-5 py-3 text-xs font-medium md:text-sm"
                >
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  联系我们
                </MagneticButton>
              </div>
            </div>
          </div>

          <div className="relative z-20 flex w-full flex-col items-center justify-between gap-5 px-6 pb-8 md:flex-row md:px-12">
            <div className="order-2 text-center text-[10px] font-semibold uppercase text-white/44 md:order-1 md:text-xs dark:text-white/44">
              © {currentYear} UniSearch. All rights reserved.
            </div>

            <div className="footer-glass-pill order-1 flex cursor-default items-center gap-2 border-white/10 px-5 py-3 md:order-2">
              <span className="text-[10px] font-bold uppercase text-white/44 md:text-xs dark:text-white/44">Built for</span>
              <ShieldCheck aria-hidden="true" className="animate-footer-heartbeat h-4 w-4 text-[#2997ff]" />
              <span className="text-[10px] font-bold uppercase text-white/44 md:text-xs dark:text-white/44">clean access by</span>
              <span className="ml-1 text-xs font-black text-white md:text-sm dark:text-white">UniSearch</span>
            </div>

            <MagneticButton
              as="button"
              onClick={scrollToTop}
              aria-label="返回顶部"
              className="footer-glass-pill group order-3 flex h-12 w-12 items-center justify-center text-blue-200 hover:text-white dark:text-blue-200 dark:hover:text-white"
            >
              <ArrowUp
                aria-hidden="true"
                className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1"
              />
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}
