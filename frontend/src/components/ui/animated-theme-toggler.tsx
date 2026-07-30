import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import {
  applyThemePreference,
  readAccountPreferences,
  writeAccountPreferences,
} from "@/lib/accountPreferences"
import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

type ViewTransitionHandle = {
  ready: Promise<void>
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle
}

type ThemeTransitionOrigin = {
  x: number
  y: number
  maxRadius: number
}

const resolveThemeTransitionOrigin = (
  button: HTMLButtonElement,
  event: React.MouseEvent<HTMLButtonElement>
): ThemeTransitionOrigin => {
  const { top, left, width, height } = button.getBoundingClientRect()
  const hasPointerCoordinates =
    event.detail > 0 && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
  const x = hasPointerCoordinates ? event.clientX : left + width / 2
  const y = hasPointerCoordinates ? event.clientY : top + height / 2
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  return { x, y, maxRadius }
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    applyThemePreference(readAccountPreferences().theme)
    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return
    const { x, y, maxRadius } = resolveThemeTransitionOrigin(buttonRef.current, event)
    const doc = document as DocumentWithViewTransition

    const performToggle = () => {
      flushSync(() => {
        const shouldUseDark = !document.documentElement.classList.contains("dark")
        const nextTheme = shouldUseDark ? "dark" : "light"
        setIsDark(shouldUseDark)
        writeAccountPreferences({
          ...readAccountPreferences(),
          theme: nextTheme,
        })
      })
    }

    if (doc.startViewTransition) {
      await doc.startViewTransition(performToggle).ready

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      )
      return
    }

    performToggle()
  }, [duration])

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(className)}
      {...props}
    >
      {isDark ? <Sun strokeWidth={1.5} /> : <Moon strokeWidth={1.5} />}
      <span className="sr-only">切换主题</span>
    </button>
  )
}
