import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-black tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-panel hover:-translate-y-0.5 hover:bg-primary/90",
        secondary: "border border-border bg-card text-primary hover:-translate-y-0.5 hover:bg-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:-translate-y-0.5 hover:bg-destructive/90",
        ghost: "text-primary hover:bg-secondary"
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-sm px-3",
        lg: "h-12 rounded-md px-6"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
