"use client";

import { Moon, SunDim } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

type props = {
  className?: string;
};

export const AnimatedThemeToggler = ({ className }: props) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  
  // Initialize from saved preference or system
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = saved ? saved === 'dark' : prefersDark;
    setIsDarkMode(shouldDark);
    document.documentElement.classList.toggle('dark', shouldDark);
  }, []);
  const changeTheme = async () => {
    if (!buttonRef.current) return;

    const perform = () => {
      flushSync(() => {
        const dark = document.documentElement.classList.toggle("dark");
        setIsDarkMode(dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      });
    };

    // Support browsers without View Transitions API
    // @ts-ignore
    if (document.startViewTransition) {
      // @ts-ignore
      await document.startViewTransition(perform).ready;
    } else {
      perform();
    }

    // Run ripple reveal only when View Transitions API is available
    // @ts-ignore
    if (document.startViewTransition) {
      const { top, left, width, height } =
        buttonRef.current.getBoundingClientRect();
      const y = top + height / 2;
      const x = left + width / 2;

      const right = window.innerWidth - left;
      const bottom = window.innerHeight - top;
      const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRad}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 700,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    }
  };
  return (
    <button ref={buttonRef} onClick={changeTheme} className={cn(className)}>
      {isDarkMode ? <SunDim /> : <Moon />}
    </button>
  );
};
