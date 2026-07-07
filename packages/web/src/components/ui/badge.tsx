import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-none border px-2.5 py-1 text-[11px] font-normal uppercase tracking-[0.08em] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]",
        secondary:
          "border-white/10 bg-white/[0.03] text-[#ffffff] hover:bg-white/[0.03]",
        destructive:
          "border-white/20 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]",
        outline: "text-foreground",
        ready:
          "border-white/20 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]",
        pending:
          "border-white/10 bg-white/[0.03] text-[#ffffff] hover:bg-white/[0.03]",
        success:
          "border-white/20 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]",
        warning:
          "border-white/20 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]",
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
