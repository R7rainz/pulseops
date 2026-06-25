import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#9FD8BD]/30",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(159,216,189,0.1)] text-[#9FD8BD] border border-[rgba(159,216,189,0.2)]",
        secondary:
          "bg-[rgba(226,163,86,0.1)] text-[#E2A356] border border-[rgba(226,163,86,0.2)]",
        destructive:
          "bg-[rgba(194,118,107,0.1)] text-[#C2766B] border border-[rgba(194,118,107,0.2)]",
        outline:
          "bg-transparent text-[#93A096] border border-[rgba(238,234,224,0.15)]",
        ghost:
          "bg-transparent text-[#93A096] border-transparent",
        link: "bg-transparent text-[#93A096] underline-offset-4 hover:underline border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
