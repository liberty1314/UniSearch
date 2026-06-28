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

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return
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

      const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
      const x = left + width / 2
      const y = top + height / 2
      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top)
      )

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
