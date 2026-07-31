import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import {
  readAccountPreferences,
  writeAccountPreferences,
} from "@/lib/accountPreferences"
import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

type ViewTransitionHandle = {
  ready: Promise<void>
  finished?: Promise<void>
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle | undefined
}

type ThemeTransitionGeometry = {
  clipPath: [string, string]
}

const getThemeTransitionGeometry = (
  button: HTMLButtonElement
): ThemeTransitionGeometry => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const { top, left, width, height } = button.getBoundingClientRect()
  const x = left + width / 2
  const y = top + height / 2
  const maxRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y)
  )
  const point = `${(x / viewportWidth) * 100}% ${(y / viewportHeight) * 100}%`
  const referenceRadius = Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2
  const radius = `${(maxRadius / referenceRadius) * 100}%`

  return {
    clipPath: [
      `circle(0% at ${point})`,
      `circle(${radius} at ${point})`,
    ],
  }
}

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  onClick,
  title,
  type = "button",
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  )
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isTransitioningRef = useRef(false)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current
    const root = document.documentElement
    if (
      !button ||
      isTransitioningRef.current ||
      root.dataset.magicuiThemeVt === "active"
    ) {
      return
    }

    let themeApplied = false
    const applyTheme = () => {
      if (themeApplied) return

      const shouldUseDark = !root.classList.contains("dark")
      themeApplied = true
      flushSync(() => {
        setIsDark(shouldUseDark)
        writeAccountPreferences({
          ...readAccountPreferences(),
          theme: shouldUseDark ? "dark" : "light",
        })
      })
    }

    const doc = document as DocumentWithViewTransition
    if (prefersReducedMotion() || typeof doc.startViewTransition !== "function") {
      applyTheme()
      return
    }

    const { clipPath } = getThemeTransitionGeometry(button)
    root.dataset.magicuiThemeVt = "active"
    root.style.setProperty("--magicui-theme-toggle-vt-duration", `${duration}ms`)
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0])
    isTransitioningRef.current = true

    let isCleaned = false
    const cleanup = () => {
      if (isCleaned) return

      isCleaned = true
      isTransitioningRef.current = false
      delete root.dataset.magicuiThemeVt
      root.style.removeProperty("--magicui-theme-toggle-vt-duration")
      root.style.removeProperty("--magicui-theme-vt-clip-from")
    }

    let transition: ViewTransitionHandle | undefined
    try {
      transition = doc.startViewTransition(() => {
        applyTheme()
      })
    } catch {
      cleanup()
      applyTheme()
      return
    }

    if (!transition) {
      cleanup()
      applyTheme()
      return
    }

    if (transition.finished) {
      transition.finished.finally(cleanup).catch(() => {})
    } else {
      transition.ready
        .finally(() => window.setTimeout(cleanup, duration))
        .catch(() => {})
    }

    transition.ready
      .then(() => {
        root.animate(
          { clipPath },
          {
            duration,
            easing: "ease-in-out",
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      })
      .catch(cleanup)
  }, [duration])

  const accessibleLabel = isDark ? "切换到浅色主题" : "切换到深色主题"
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) {
        toggleTheme()
      }
    },
    [onClick, toggleTheme]
  )

  return (
    <button
      {...props}
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      aria-label={props["aria-label"] ?? accessibleLabel}
      title={title ?? accessibleLabel}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 [&_svg]:h-5 [&_svg]:w-5",
        className
      )}
    >
      {isDark ? <Sun strokeWidth={1.5} /> : <Moon strokeWidth={1.5} />}
    </button>
  )
}
