import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-3 py-1 text-xs font-black", {
  variants: {
    variant: {
      ready: "bg-primary/10 text-primary",
      pending: "bg-accent/15 text-accent-foreground",
      outline: "border border-border bg-card text-muted-foreground"
    }
  },
  defaultVariants: { variant: "outline" }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
