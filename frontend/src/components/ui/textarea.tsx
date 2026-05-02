import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "glass-input flex min-h-[80px] px-4 py-3 text-base sm:text-base focus:bg-white/82 dark:focus:bg-slate-900/62 disabled:bg-gray-100/75 dark:disabled:bg-slate-900/66",
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
