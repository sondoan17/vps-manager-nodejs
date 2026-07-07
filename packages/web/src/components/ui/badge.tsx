import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#000000] text-white hover:bg-[#000000]",
        secondary:
          "border-transparent bg-neutral-100 text-secondary-foreground hover:bg-neutral-100",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        ready:
          "border-neutral-800/15 bg-[#ffffff] text-[#000000] hover:bg-[#ffffff]",
        pending:
          "border-neutral-800/15 bg-[#a3a3a3] text-[#000000] hover:bg-[#a3a3a3]",
        success:
          "border-neutral-800/20 bg-neutral-600 text-white hover:bg-neutral-600",
        warning:
          "border-neutral-800/20 bg-neutral-500 text-neutral-950 hover:bg-neutral-500",
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
