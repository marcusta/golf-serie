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
        <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            No recent activity
          </h4>
          <p className="text-sm text-gray-600">
            Competition results will appear here as they become available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
        {competitions.length > maxItems && (
          <button className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors">
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
                <div className="absolute left-6 top-12 w-0.5 h-12 bg-green-200" />
              )}

              {/* Activity item */}
              <Link
                to={`/player/competitions/${competition.id}`}
                className="group block"
              >
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-3 h-3 rounded-full mt-3",
                      isFirst
                        ? "bg-green-600 shadow-lg shadow-green-600/30"
                        : isPast
                        ? "bg-gray-400"
                        : "bg-orange-500"
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 truncate">
                            {competition.name}
                          </h4>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                              isPast
                                ? "text-gray-700 bg-gray-100"
                                : isFirst
                                ? "text-green-700 bg-green-100"
                                : "text-orange-700 bg-orange-100"
                            )}
                          >
                            {isPast
                              ? "Completed"
                              : isFirst
                              ? "Latest"
                              : "Upcoming"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
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
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <Trophy className="h-4 w-4" />
                              <span className="font-medium">
                                Results available - View standings
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0 mt-1" />
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
        <div className="pt-4 border-t border-gray-200">
          <button className="w-full py-3 text-sm font-medium text-green-600 hover:text-green-700 transition-colors text-center">
            View all {competitions.length} competitions
          </button>
        </div>
      )}
    </section>
  );
}

export default RecentActivity;
