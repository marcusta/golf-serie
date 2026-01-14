import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Competition {
  id: number;
  name: string;
  date: string;
  participant_count: number;
}

interface RecentActivityProps {
  competitions?: Competition[];
  className?: string;
  maxItems?: number;
}

export function RecentActivity({
  competitions = [],
  className,
  maxItems = 5,
}: RecentActivityProps) {
  const recentCompetitions = competitions.slice(0, maxItems);

  if (!recentCompetitions.length) {
    return (
      <section className={cn("space-y-4", className)}>
        <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal">
          Recent Activity
        </h3>
        <div className="text-center py-8 text-charcoal/70">
          <p className="text-sm">
            Competition results will appear here as they become available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal">
          Recent Activity
        </h3>
        {competitions.length > maxItems && (
          <button className="text-sm font-medium text-turf hover:text-fairway transition-colors">
            View all
          </button>
        )}
      </div>

      <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
        {recentCompetitions.map((competition, index) => {
          const competitionDate = new Date(competition.date);
          const isPast = competitionDate < new Date();
          const isFirst = index === 0;

          return (
            <Link
              key={competition.id}
              to={`/player/competitions/${competition.id}`}
              className="block px-4 py-4 hover:bg-turf/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-charcoal truncate">
                      {competition.name}
                    </h4>
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium whitespace-nowrap",
                        isPast
                          ? "bg-charcoal text-scorecard"
                          : isFirst
                          ? "bg-turf text-scorecard"
                          : "bg-coral text-scorecard"
                      )}
                    >
                      {isPast ? "Completed" : isFirst ? "Latest" : "Upcoming"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-charcoal/70">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-turf flex-shrink-0" />
                      <span className="truncate">
                        {competitionDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-turf flex-shrink-0" />
                      <span>{competition.participant_count}</span>
                    </div>
                  </div>

                  {isFirst && isPast && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-turf">
                      <Trophy className="h-4 w-4" />
                      <span className="font-medium">
                        Results available - View standings
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {competitions.length > maxItems && (
        <div className="pt-2">
          <button className="w-full py-2 text-sm font-medium text-turf hover:text-fairway transition-colors text-center">
            View all {competitions.length} competitions
          </button>
        </div>
      )}
    </section>
  );
}

export default RecentActivity;
