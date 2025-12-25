import { Link, useParams } from "@tanstack/react-router";
import { useTour, useTourCompetitions, type TourCompetition } from "@/api/tours";
import {
  Calendar,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
  MapPin,
  Play,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-4">
        {[...Array(5)].map((_, i) => (
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
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-soft-grey text-charcoal hover:bg-rough/20 hover:border-turf rounded-lg transition-colors"
          >
            Back to Tour
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TourCompetitions() {
  const { tourId } = useParams({ from: "/player/tours/$tourId/competitions" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "upcoming" | "past">("all");

  const id = parseInt(tourId);

  // Helper function to check if a competition is currently open
  const isCompetitionOpen = useCallback((comp: TourCompetition): boolean => {
    if (comp.start_mode !== "open" || !comp.open_start || !comp.open_end) {
      return false;
    }
    const now = new Date();
    const openStart = new Date(comp.open_start);
    const openEnd = new Date(comp.open_end);
    return now >= openStart && now <= openEnd;
  }, []);
  const {
    data: tour,
    isLoading: tourLoading,
    error: tourError,
  } = useTour(id);

  const {
    data: competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
    refetch: refetchCompetitions,
  } = useTourCompetitions(id);

  // Memoize today's date to avoid recreating on each render
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filter and search competitions
  const filteredCompetitions = useMemo(() => {
    if (!competitions) return [];

    return competitions.filter((comp) => {
      // Search filter
      const matchesSearch =
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.course_name &&
          comp.course_name.toLowerCase().includes(searchQuery.toLowerCase()));

      // Date filter
      const compDate = new Date(comp.date);
      compDate.setHours(0, 0, 0, 0);
      const isUpcoming = compDate >= today;
      const isPast = compDate < today;
      const isOpen = isCompetitionOpen(comp);

      const matchesFilter =
        filter === "all" ||
        (filter === "open" && isOpen) ||
        (filter === "upcoming" && isUpcoming) ||
        (filter === "past" && isPast);

      return matchesSearch && matchesFilter;
    });
  }, [competitions, searchQuery, filter, today, isCompetitionOpen]);

  // Check if there are any open competitions (for showing "Open" filter button)
  const hasOpenCompetitions = useMemo(() => {
    return competitions?.some(isCompetitionOpen) || false;
  }, [competitions, isCompetitionOpen]);

  // Group by month
  const groupedCompetitions = useMemo(() => {
    const groups: { [key: string]: typeof filteredCompetitions } = {};

    filteredCompetitions.forEach((comp) => {
      const date = new Date(comp.date);
      const monthKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(comp);
    });

    return groups;
  }, [filteredCompetitions]);

  if (tourLoading || competitionsLoading) return <LoadingSkeleton />;

  if (tourError) {
    return (
      <ErrorState
        title="Tour Not Found"
        message="The tour you're looking for doesn't exist or may have been removed."
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

  if (!tour) {
    return (
      <ErrorState
        title="Tour Unavailable"
        message="This tour is currently unavailable. Please try again later."
      />
    );
  }

  return (
    <PlayerPageLayout title="Competitions">

      {/* Sub-header with Page Title */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Competitions
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                {tour.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-charcoal/50" />
            <input
              type="text"
              placeholder="Search competitions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-soft-grey rounded-xl bg-scorecard text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Show "Open" filter prominently if there are open competitions */}
            {hasOpenCompetitions && (
              <button
                onClick={() => setFilter("open")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filter === "open"
                    ? "bg-coral text-scorecard"
                    : "bg-coral/10 text-coral hover:bg-coral/20 border border-coral/30"
                }`}
              >
                <Play className="h-4 w-4" />
                Open Now
              </button>
            )}
            {(["all", "upcoming", "past"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f
                    ? "bg-turf text-scorecard"
                    : "bg-rough text-charcoal hover:bg-soft-grey"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Competitions List */}
        {!competitions || competitions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Competitions Yet
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Competitions will be added to this tour soon.
            </p>
            <Button
              onClick={() => window.history.back()}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Back to Tour Overview
            </Button>
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Competitions Found
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              No competitions match your search or filter.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                }}
                className="bg-turf hover:bg-fairway text-scorecard"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedCompetitions).map(([month, comps]) => (
              <div key={month}>
                <h3 className="text-label-lg font-display font-semibold text-charcoal mb-4 sticky top-0 bg-scorecard py-2">
                  {month}
                </h3>
                <div className="space-y-4">
                  {comps.map((competition) => {
                    const compDate = new Date(competition.date);
                    compDate.setHours(0, 0, 0, 0);
                    const isUpcoming = compDate >= today;
                    const isToday = compDate.getTime() === today.getTime();
                    const isOpen = isCompetitionOpen(competition);

                    return (
                      <Link
                        key={competition.id}
                        to="/player/competitions/$competitionId"
                        params={{ competitionId: competition.id.toString() }}
                        className={`block p-4 rounded-xl border transition-all duration-200 group bg-scorecard ${
                          isOpen
                            ? "border-coral shadow-md ring-2 ring-coral/20 hover:border-coral hover:shadow-lg"
                            : "border-soft-grey hover:border-turf hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Date Badge */}
                          <div
                            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                              isOpen
                                ? "bg-coral text-scorecard"
                                : isToday
                                ? "bg-coral text-scorecard"
                                : isUpcoming
                                ? "bg-turf/10 text-turf"
                                : "bg-rough text-charcoal/60"
                            }`}
                          >
                            {isOpen ? (
                              <>
                                <Play className="h-6 w-6" />
                                <span className="text-[10px] font-semibold">LIVE</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-medium uppercase">
                                  {new Date(competition.date).toLocaleDateString(
                                    "en-US",
                                    { month: "short" }
                                  )}
                                </span>
                                <span className="text-xl font-bold">
                                  {new Date(competition.date).getDate()}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Competition Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {isOpen && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-coral text-scorecard animate-pulse">
                                  OPEN NOW
                                </span>
                              )}
                              {isToday && !isOpen && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-coral text-scorecard">
                                  TODAY
                                </span>
                              )}
                              <h4 className="text-label-lg font-semibold text-charcoal group-hover:text-fairway transition-colors truncate">
                                {competition.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {competition.course_name && (
                                <div className="flex items-center gap-1 text-body-sm text-charcoal/70">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">
                                    {competition.course_name}
                                  </span>
                                </div>
                              )}
                              {isOpen && competition.open_end && (
                                <span className="text-xs text-coral font-medium">
                                  Open until{" "}
                                  {new Date(competition.open_end).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="h-5 w-5 text-charcoal/30 flex-shrink-0 group-hover:text-turf transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </PlayerPageLayout>
  );
}
