import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border bg-clip-padding text-label-md whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-[#9FD8BD]/30 focus-visible:border-[#9FD8BD] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-[#EEEAE0] text-[#0A0F0C] rounded-[999px] px-15_2 py-11 border-0 hover:bg-[#EEEAE0]/90",
        secondary:
          "bg-transparent text-[#93A096] rounded-[999px] px-8_8 py-6 border border-[rgba(238,234,224,0.1)] hover:bg-[rgba(238,234,224,0.04)] hover:text-[#EEEAE0]",
        outline:
          "bg-transparent text-[#93A096] rounded-[999px] px-8_8 py-6 border border-[rgba(238,234,224,0.1)] hover:bg-[rgba(238,234,224,0.04)] hover:text-[#EEEAE0]",
        ghost:
          "bg-transparent text-[#93A096] rounded-[999px] px-8_8 py-6 border-transparent hover:bg-[rgba(238,234,224,0.04)] hover:text-[#EEEAE0]",
        destructive:
          "bg-transparent text-[#C2766B] rounded-[999px] px-8_8 py-6 border border-[rgba(194,118,107,0.2)] hover:bg-[rgba(194,118,107,0.08)] hover:text-[#C2766B]",
        link: "bg-transparent text-[#93A096] rounded-none px-4 py-2 border-0 underline-offset-4 hover:text-[#EEEAE0] hover:underline",
      },
      size: {
        default: "h-10 gap-1.5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-3 text-[12px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
