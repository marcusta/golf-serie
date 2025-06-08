import { Calendar, MapPin, Users } from "lucide-react";

interface CompetitionInfoBarProps {
  competition: { date: string };
  courseName?: string;
  totalParticipants: number;
  variant?: "header" | "footer";
}

export function CompetitionInfoBar({
  competition,
  courseName,
  totalParticipants,
  variant = "footer",
}: CompetitionInfoBarProps) {
  const baseClass =
    variant === "header"
      ? "rounded-xl p-4 border border-soft-grey"
      : "border-t border-soft-grey px-4 py-2 flex-shrink-0";

  const baseStyle = {
    backgroundColor: "rgba(149, 213, 178, 0.3)", // bg-rough with 30% opacity
  };

  return (
    <div className={baseClass} style={baseStyle}>
      <div className="flex items-center justify-center gap-4 md:gap-8 text-xs text-charcoal font-primary">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-turf" />
          <span className="hidden sm:inline">
            {new Date(competition.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="sm:hidden">
            {new Date(competition.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-turf" />
          <span className="truncate">{courseName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-turf" />
          <span>{totalParticipants} participants</span>
        </div>
      </div>
    </div>
  );
}
