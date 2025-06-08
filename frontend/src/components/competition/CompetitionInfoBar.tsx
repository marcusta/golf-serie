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
      ? "bg-rough/30 rounded-xl p-4 border border-soft-grey"
      : "bg-rough/30 border-t border-soft-grey px-4 py-3 flex-shrink-0";

  return (
    <div className={baseClass}>
      <div className="flex items-center justify-center gap-4 md:gap-8 text-label-sm text-charcoal font-primary">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-turf" />
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
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-turf" />
          <span className="truncate">{courseName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-turf" />
          <span>{totalParticipants} participants</span>
        </div>
      </div>
    </div>
  );
}
