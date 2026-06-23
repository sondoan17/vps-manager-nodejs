import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-sm border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
