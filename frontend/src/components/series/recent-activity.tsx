import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  ChevronRight,
  Trophy,
  TrendingUp,
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
      <section className={cn("space-y-6", className)}>
        <h3 className="text-display-sm font-display font-semibold text-charcoal">
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-rough/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-turf" />
          </div>
          <h4 className="text-label-lg font-semibold text-charcoal mb-2">
            No recent activity
          </h4>
          <p className="text-body-sm text-charcoal/70">
            Competition results will appear here as they become available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-display-sm font-display font-semibold text-charcoal">
          Recent Activity
        </h3>
        {competitions.length > maxItems && (
          <button className="text-label-md font-medium text-turf hover:text-fairway transition-colors">
            View all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {recentCompetitions.map((competition, index) => {
          const competitionDate = new Date(competition.date);
          const isPast = competitionDate < new Date();
          const isFirst = index === 0;

          return (
            <div key={competition.id} className="relative">
              {/* Timeline line */}
              {index !== recentCompetitions.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-12 bg-turf/20" />
              )}

              {/* Activity item */}
              <Link
                to={`/player/competitions/${competition.id}`}
                className="group block"
              >
                <div className="flex items-start gap-4 p-4 rounded-xl bg-scorecard border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-3 h-3 rounded-full mt-3",
                      isFirst
                        ? "bg-turf shadow-lg shadow-turf/30"
                        : isPast
                        ? "bg-charcoal/30"
                        : "bg-coral"
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-label-lg font-semibold text-charcoal truncate">
                            {competition.name}
                          </h4>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-label-sm font-medium whitespace-nowrap",
                              isPast
                                ? "text-charcoal bg-charcoal/10"
                                : isFirst
                                ? "text-turf bg-turf/10"
                                : "text-coral bg-coral/10"
                            )}
                          >
                            {isPast
                              ? "Completed"
                              : isFirst
                              ? "Latest"
                              : "Upcoming"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-body-sm text-charcoal/70">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {competitionDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span>{competition.participant_count}</span>
                          </div>
                        </div>

                        {/* Additional context for latest/completed */}
                        {isFirst && isPast && (
                          <div className="mt-3 pt-3 border-t border-soft-grey">
                            <div className="flex items-center gap-2 text-body-sm text-turf">
                              <Trophy className="h-4 w-4" />
                              <span className="font-medium">
                                Results available - View standings
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-charcoal/30 group-hover:text-turf transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Show more link for mobile */}
      {competitions.length > maxItems && (
        <div className="pt-4 border-t border-soft-grey">
          <button className="w-full py-3 text-label-md font-medium text-turf hover:text-fairway transition-colors text-center">
            View all {competitions.length} competitions
          </button>
        </div>
      )}
    </section>
  );
}

export default RecentActivity;
