import * as React from "react";
import { cn } from "../../lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn("grid gap-2 text-sm font-bold text-muted-foreground", className)} {...props} />
));
Label.displayName = "Label";
