import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesCompetitions } from "@/api/series";
import { useCourses } from "@/api/courses";
import {
  Calendar,
  Users,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  MapPin,
  Filter,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CommonHeader } from "@/components/navigation/CommonHeader";

type FilterStatus = "all" | "upcoming" | "active" | "completed";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-soft-grey text-charcoal hover:bg-rough/20"
          >
            Back to Series
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SeriesCompetitions() {
  const { serieId } = useParams({
    from: "/player/series/$serieId/competitions",
  });
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
  } = useSingleSeries(seriesId);

  const {
    data: competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
    refetch: refetchCompetitions,
  } = useSeriesCompetitions(seriesId);

  const { data: courses } = useCourses();

  // Filter competitions based on status
  const now = new Date();
  const filteredCompetitions = competitions?.filter((competition) => {
    const competitionDate = new Date(competition.date);
    const isPast = competitionDate < now;
    const isToday = competitionDate.toDateString() === now.toDateString();

    switch (statusFilter) {
      case "upcoming":
        return !isPast && !isToday;
      case "active":
        return isToday;
      case "completed":
        return isPast;
      default:
        return true;
    }
  });

  // Group competitions by status for stats
  const competitionStats = competitions?.reduce(
    (acc, competition) => {
      const competitionDate = new Date(competition.date);
      const isPast = competitionDate < now;
      const isToday = competitionDate.toDateString() === now.toDateString();

      if (isPast) acc.completed++;
      else if (isToday) acc.active++;
      else acc.upcoming++;

      return acc;
    },
    { upcoming: 0, active: 0, completed: 0 }
  ) || { upcoming: 0, active: 0, completed: 0 };

  if (seriesLoading || competitionsLoading) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
      />
    );
  }

  if (competitionsError) {
    return (
      <ErrorState
        title="Error Loading Competitions"
        message="Unable to load competitions. Please try again."
        onRetry={() => refetchCompetitions()}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
      />
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="min-h-screen bg-scorecard">
        <CommonHeader title={series.name} />

        {/* Sub-header with Page Title */}
        <div className="bg-scorecard border-b border-soft-grey shadow-sm">
          <div className="container mx-auto px-4">
            <div className="py-4">
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Competitions
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Browse series competitions and events
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Competitions Available
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Competitions will be added to this series soon.
            </p>
            <Button
              onClick={() => window.history.back()}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Back to Series Overview
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scorecard">
      <CommonHeader title={series.name} />

      {/* Sub-header with Page Title and Filter */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Competitions
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Browse series competitions and events
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-charcoal/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: "all", label: "All", count: competitions.length },
              {
                key: "upcoming",
                label: "Upcoming",
                count: competitionStats.upcoming,
              },
              {
                key: "active",
                label: "Active",
                count: competitionStats.active,
              },
              {
                key: "completed",
                label: "Completed",
                count: competitionStats.completed,
              },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as FilterStatus)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filter.key
                    ? "bg-turf text-scorecard shadow-lg"
                    : "bg-scorecard border border-soft-grey text-charcoal hover:border-turf hover:bg-rough/20"
                }`}
              >
                {filter.label}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    statusFilter === filter.key
                      ? "bg-scorecard/20 text-scorecard"
                      : "bg-charcoal/10 text-charcoal/70"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Competitions List */}
        {filteredCompetitions?.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No {statusFilter !== "all" ? statusFilter : ""} Competitions
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              {statusFilter === "all"
                ? "No competitions are available."
                : `No ${statusFilter} competitions found.`}
            </p>
            <Button
              onClick={() => setStatusFilter("all")}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Show All Competitions
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-display-sm font-display font-semibold text-charcoal">
                {statusFilter === "all"
                  ? "All"
                  : statusFilter.charAt(0).toUpperCase() +
                    statusFilter.slice(1)}{" "}
                Competitions
              </h2>
              <span className="text-body-sm text-charcoal/70">
                {filteredCompetitions?.length || 0} competition
                {(filteredCompetitions?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-4">
              {filteredCompetitions?.map((competition) => {
                const competitionDate = new Date(competition.date);
                const course = courses?.find(
                  (c) => c.id === competition.course_id
                );
                const isPast = competitionDate < new Date();
                const isToday =
                  competitionDate.toDateString() === new Date().toDateString();

                return (
                  <Link
                    key={competition.id}
                    to="/player/competitions/$competitionId"
                    params={{ competitionId: competition.id.toString() }}
                    className="block p-6 rounded-xl border border-soft-grey hover:border-turf hover:shadow-lg transition-all duration-200 group bg-scorecard"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-rough rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-turf/20 transition-colors">
                        <Calendar className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-label-lg font-semibold text-charcoal group-hover:text-fairway transition-colors">
                            {competition.name}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isPast
                                ? "bg-charcoal/10 text-charcoal/70"
                                : isToday
                                ? "bg-coral text-scorecard"
                                : "bg-turf/20 text-turf"
                            }`}
                          >
                            {isPast
                              ? "Completed"
                              : isToday
                              ? "Today"
                              : "Upcoming"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-body-sm text-charcoal/70 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {competitionDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          {course && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {course.name}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {competition.participant_count} participant
                            {competition.participant_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-charcoal/30 flex-shrink-0 group-hover:text-turf transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
