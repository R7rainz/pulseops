import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 bg-[rgba(238,234,224,0.03)] border border-[rgba(238,234,224,0.15)] rounded-[9px] px-12 py-10 text-sm text-[#EEEAE0] transition-[color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#93A096] placeholder:text-[#93A096]/40 focus-visible:border-[#9FD8BD] focus-visible:ring-2 focus-visible:ring-[rgba(159,216,189,0.2)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#C2766B] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
