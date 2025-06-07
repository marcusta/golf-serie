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
      ? "bg-gray-50 rounded-lg p-4 border border-gray-200"
      : "bg-gray-50 border-t border-gray-200 px-4 py-2 flex-shrink-0";

  return (
    <div className={baseClass}>
      <div className="flex items-center justify-center gap-4 md:gap-8 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
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
          <MapPin className="h-3 w-3" />
          <span className="truncate">{courseName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{totalParticipants} participants</span>
        </div>
      </div>
    </div>
  );
}
