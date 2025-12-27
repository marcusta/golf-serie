import { Link } from "@tanstack/react-router";
import {
  Calendar,
  MapPin,
  ChevronRight,
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

  const totalUpcoming = competitions.filter((comp) => {
    const compDate = new Date(comp.date);
    compDate.setHours(0, 0, 0, 0);
    return compDate > today;
  }).length;

  if (!upcomingCompetitions.length) {
    return (
      <section className={cn("space-y-4", className)}>
        <h3 className="text-display-sm font-display font-semibold text-charcoal">
          Upcoming Competitions
        </h3>
        <div className="text-center py-8 text-charcoal/70">
          <CalendarDays className="h-8 w-8 text-turf mx-auto mb-3" />
          <p className="text-sm">
            No upcoming competitions scheduled.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-display-sm font-display font-semibold text-charcoal">
          Upcoming Competitions
        </h3>
        {totalUpcoming > maxItems && (
          <button className="text-sm font-medium text-turf hover:text-fairway transition-colors">
            View all
          </button>
        )}
      </div>

      <div className="divide-y divide-soft-grey">
        {upcomingCompetitions.map((competition, index) => {
          const competitionDate = new Date(competition.date);
          const isNext = index === 0;

          return (
            <Link
              key={competition.id}
              to={`/player/competitions/${competition.id}`}
              className={cn(
                "block py-4 hover:bg-gray-50/50 transition-colors",
                isNext && "border-l-4 border-l-turf pl-4 bg-turf/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-charcoal truncate">
                    {competition.name}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-charcoal/70 mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-turf" />
                      <span>
                        {competitionDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {competition.course && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-turf" />
                        <span className="truncate">
                          {competition.course.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Show more link if there are more upcoming competitions */}
      {totalUpcoming > maxItems && (
        <div className="pt-2">
          <button className="w-full py-2 text-sm font-medium text-turf hover:text-fairway transition-colors text-center">
            View all {totalUpcoming} upcoming competitions
          </button>
        </div>
      )}
    </section>
  );
}

export default UpcomingCompetitions;
