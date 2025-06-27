import { Link } from "@tanstack/react-router";
import {
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  Clock,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Competition {
  id: number;
  name: string;
  date: string;
  participant_count: number;
  course?: {
    id: number;
    name: string;
  };
}

interface UpcomingCompetitionsProps {
  competitions: Competition[];
  className?: string;
  maxItems?: number;
}

export function UpcomingCompetitions({
  competitions,
  className,
  maxItems = 3,
}: UpcomingCompetitionsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter for upcoming competitions (excluding today)
  const upcomingCompetitions = competitions
    .filter((comp) => {
      const compDate = new Date(comp.date);
      compDate.setHours(0, 0, 0, 0);
      return compDate > today;
    })
    .slice(0, maxItems);

  if (!upcomingCompetitions.length) {
    return (
      <section className={cn("space-y-6", className)}>
        <h3 className="text-xl font-semibold text-gray-900">
          Upcoming Competitions
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="h-8 w-8 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            No upcoming competitions
          </h4>
          <p className="text-sm text-gray-600">
            New competitions will appear here when they are scheduled.
          </p>
        </div>
      </section>
    );
  }

  const formatDaysUntil = (date: string): string => {
    const compDate = new Date(date);
    const diffTime = compDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays <= 14) return `Next week`;
    return `In ${diffDays} days`;
  };

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Upcoming Competitions
        </h3>
        {competitions.filter((comp) => {
          const compDate = new Date(comp.date);
          compDate.setHours(0, 0, 0, 0);
          return compDate > today;
        }).length > maxItems && (
          <button className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors">
            View all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {upcomingCompetitions.map((competition, index) => {
          const competitionDate = new Date(competition.date);
          const isNext = index === 0;

          return (
            <Link
              key={competition.id}
              to={`/player/competitions/${competition.id}`}
              className="group block"
            >
              <div
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200 hover:shadow-md",
                  isNext
                    ? "bg-green-50 border-green-200 hover:border-green-300"
                    : "bg-white border-gray-200 hover:border-green-300"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                        {competition.name}
                      </h4>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                          isNext
                            ? "text-green-700 bg-green-100"
                            : "text-gray-600 bg-gray-100"
                        )}
                      >
                        {formatDaysUntil(competition.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {competitionDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {competition.course && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {competition.course.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {competition.participant_count} participants
                        </span>
                      </div>
                      {isNext && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">Next up</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight
                    className={cn(
                      "h-5 w-5 flex-shrink-0 mt-1 transition-colors",
                      isNext
                        ? "text-green-600 group-hover:text-green-700"
                        : "text-gray-400 group-hover:text-green-600"
                    )}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Show more link if there are more upcoming competitions */}
      {competitions.filter((comp) => {
        const compDate = new Date(comp.date);
        compDate.setHours(0, 0, 0, 0);
        return compDate > today;
      }).length > maxItems && (
        <div className="pt-4 border-t border-gray-200">
          <button className="w-full py-3 text-sm font-medium text-green-600 hover:text-green-700 transition-colors text-center">
            View all{" "}
            {
              competitions.filter((comp) => {
                const compDate = new Date(comp.date);
                compDate.setHours(0, 0, 0, 0);
                return compDate > today;
              }).length
            }{" "}
            upcoming competitions
          </button>
        </div>
      )}
    </section>
  );
}

export default UpcomingCompetitions;
