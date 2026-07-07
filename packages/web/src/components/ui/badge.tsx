import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[#171717] bg-[#171717] text-white hover:bg-[#171717]",
        secondary:
          "border-[#ebebeb] bg-[#fafafa] text-[#171717] hover:bg-[#fafafa]",
        destructive:
          "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-900",
        outline: "text-foreground",
        ready:
          "border-[#171717] bg-white text-[#171717] hover:bg-white",
        pending:
          "border-[#d4d4d4] bg-[#fafafa] text-[#171717] hover:bg-[#fafafa]",
        success:
          "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-900",
        warning:
          "border-[#171717] bg-white text-[#171717] hover:bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
