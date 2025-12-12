import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants: Record<string, string> = {
  default: "bg-blue-600 text-white",
  secondary: "bg-gray-100 text-gray-800 border border-gray-200",
  outline: "border border-current text-current bg-transparent",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant] ?? badgeVariants.default,
        className
      )}
      {...props}
    />
  );
}
