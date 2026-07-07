import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[#FF6363]/40 bg-[#FF6363]/15 text-[#ffb0b0] hover:bg-[#FF6363]/20",
        secondary:
          "border-white/[0.06] bg-[#101111] text-[#f9f9f9] hover:bg-[#101111]",
        destructive:
          "border-[#FF6363]/40 bg-[#FF6363]/15 text-[#ffb0b0] hover:bg-[#FF6363]/20",
        outline: "text-foreground",
        ready:
          "border-[#55b3ff]/35 bg-[#55b3ff]/15 text-[#9bd4ff] hover:bg-[#55b3ff]/20",
        pending:
          "border-white/[0.1] bg-[#101111] text-[#f9f9f9] hover:bg-[#101111]",
        success:
          "border-[#5fc992]/35 bg-[#5fc992]/15 text-[#9fe0bd] hover:bg-[#5fc992]/20",
        warning:
          "border-[#ffbc33]/35 bg-[#ffbc33]/15 text-[#ffd685] hover:bg-[#ffbc33]/20",
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
