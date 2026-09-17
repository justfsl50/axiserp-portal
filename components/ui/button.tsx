import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger" | "warning";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-[#c9a0ff] text-zinc-950 hover:bg-[#d8b8ff] shadow-[0_0_20px_rgba(201,160,255,0.25)] font-semibold",
      secondary: "bg-zinc-900 text-zinc-100 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700",
      outline: "bg-transparent border border-zinc-700 text-zinc-200 hover:bg-zinc-900 hover:text-white",
      ghost: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
      danger: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
      warning: "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs rounded-md",
      lg: "h-12 px-6 text-base rounded-md",
      icon: "h-9 w-9 p-0"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a0ff]/50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
