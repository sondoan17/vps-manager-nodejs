import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[#161612] bg-[#161612] text-[#ffcc00] hover:bg-[#161612]",
        secondary:
          "border-[#ded8bd] bg-[#fff7cc] text-[#161612] hover:bg-[#fff7cc]",
        destructive:
          "border-[#5f4b00] bg-[#5f4b00] text-white hover:bg-[#5f4b00]",
        outline: "text-foreground",
        ready:
          "border-[#161612]/25 bg-[#ffcc00] text-[#161612] hover:bg-[#ffcc00]",
        pending:
          "border-[#c49b00]/40 bg-[#fff7cc] text-[#5f4b00] hover:bg-[#fff7cc]",
        success:
          "border-[#161612]/25 bg-[#5f4b00] text-white hover:bg-[#5f4b00]",
        warning:
          "border-[#161612]/25 bg-[#ffcc00] text-[#161612] hover:bg-[#ffcc00]",
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
