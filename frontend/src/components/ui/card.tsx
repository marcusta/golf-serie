import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-scorecard text-charcoal flex flex-col gap-6 rounded-xl border-2 border-soft-grey py-6 shadow-[0_2px_8px_rgba(27,67,50,0.08)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [&.border-b]:border-b-2 [&.border-b]:border-soft-grey [&.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "leading-tight font-semibold font-['DM_Sans'] text-charcoal text-lg",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-soft-grey text-sm font-['Inter'] leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 font-['Inter']", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-6 font-['Inter'] [&.border-t]:border-t-2 [&.border-t]:border-soft-grey [&.border-t]:pt-6",
        className
      )}
      {...props}
    />
  );
}

// Golf-specific card variants
function ScoreCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="score-card"
      className={cn(
        "bg-gradient-to-br from-scorecard to-rough text-charcoal flex flex-col gap-4 rounded-xl border-2 border-turf p-4 shadow-[0_2px_8px_rgba(27,67,50,0.08)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}

function LeaderboardCard({
  className,
  position = 0,
  ...props
}: React.ComponentProps<"div"> & { position?: number }) {
  const getBorderColor = (pos: number) => {
    if (pos === 1) return "border-l-[#FFD700]"; // Gold
    if (pos === 2) return "border-l-[#C0C0C0]"; // Silver
    if (pos === 3) return "border-l-[#CD7F32]"; // Bronze
    return "border-l-rough";
  };

  return (
    <div
      data-slot="leaderboard-card"
      className={cn(
        "bg-scorecard text-charcoal flex flex-col gap-3 rounded-xl border-2 border-soft-grey border-l-4 p-4 shadow-[0_2px_8px_rgba(27,67,50,0.08)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:translate-x-1 hover:bg-rough mb-2",
        getBorderColor(position),
        className
      )}
      {...props}
    />
  );
}

function CompetitionCard({
  className,
  status,
  ...props
}: React.ComponentProps<"div"> & {
  status?: "active" | "completed" | "pending" | "error";
}) {
  const getStatusStyles = (status?: string) => {
    switch (status) {
      case "active":
        return "border-coral shadow-[0_2px_8px_rgba(255,159,28,0.15)]";
      case "completed":
        return "border-turf shadow-[0_2px_8px_rgba(45,106,79,0.15)]";
      case "pending":
        return "border-sky shadow-[0_2px_8px_rgba(17,138,178,0.15)]";
      case "error":
        return "border-flag shadow-[0_2px_8px_rgba(239,71,111,0.15)]";
      default:
        return "border-soft-grey shadow-[0_2px_8px_rgba(27,67,50,0.08)]";
    }
  };

  return (
    <div
      data-slot="competition-card"
      className={cn(
        "bg-scorecard text-charcoal flex flex-col gap-4 rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(27,67,50,0.12)] hover:-translate-y-0.5",
        getStatusStyles(status),
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  ScoreCard,
  LeaderboardCard,
  CompetitionCard,
};
