import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva("relative w-full break-words rounded-md border p-4 text-sm leading-6", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      success: "border-primary/30 bg-primary/10 text-primary",
      destructive: "border-destructive/30 bg-destructive/10 text-destructive"
    }
  },
  defaultVariants: { variant: "default" }
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="status" className={cn(alertVariants({ variant, className }))} {...props} />
));
Alert.displayName = "Alert";
