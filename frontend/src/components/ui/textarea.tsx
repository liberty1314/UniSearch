import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[1rem] px-4 py-3 text-base sm:text-base bg-white/60 dark:bg-slate-900/40 border-[0.5px] border-slate-200/70 dark:border-white/10 backdrop-blur-xl backdrop-saturate-[180%] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:border-blue-500 dark:focus:border-blue-300 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:bg-white/80 dark:focus:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
