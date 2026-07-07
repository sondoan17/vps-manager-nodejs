import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#15181e] text-white hover:bg-[#15181e]",
        secondary:
          "border-transparent bg-stone-100 text-secondary-foreground hover:bg-stone-100",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        ready:
          "border-emerald-800/15 bg-[#36c275] text-[#0d0e12] hover:bg-[#36c275]",
        pending:
          "border-amber-800/15 bg-[#ffb000] text-[#0d0e12] hover:bg-[#ffb000]",
        success:
          "border-emerald-800/20 bg-emerald-600 text-white hover:bg-emerald-600",
        warning:
          "border-orange-800/20 bg-orange-500 text-slate-950 hover:bg-orange-500",
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
