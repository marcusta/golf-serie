import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold font-['Inter'] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turf",
  {
    variants: {
      variant: {
        default:
          "bg-coral text-scorecard border-2 border-coral shadow-sm hover:bg-[#E8890A] hover:border-[#E8890A] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-turf",
        destructive:
          "bg-flag text-scorecard border-2 border-flag shadow-sm hover:bg-[#DC2449] hover:border-[#DC2449] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-flag",
        outline:
          "border-2 border-soft-grey bg-scorecard text-charcoal shadow-sm hover:bg-rough hover:border-rough hover:text-fairway hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-turf",
        secondary:
          "bg-transparent text-turf border-2 border-turf shadow-sm hover:bg-rough hover:text-fairway hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-turf",
        ghost:
          "text-charcoal hover:bg-rough hover:text-fairway focus-visible:outline-turf",
        link: "text-turf underline-offset-4 hover:underline hover:text-fairway focus-visible:outline-turf",
      },
      size: {
        default: "h-10 px-6 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-4 has-[>svg]:px-3 text-sm",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
