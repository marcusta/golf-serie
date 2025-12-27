import { Link, useParams } from "@tanstack/react-router";
import { useTour, useTourCompetitions, usePlayerEnrollments, type TourCompetition } from "@/api/tours";
import { useMyRegistration } from "@/api/tour-registration";
import {
  Calendar,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import { JoinCompetitionFlow } from "@/components/tour";

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
  const [joinCompetition, setJoinCompetition] = useState<TourCompetition | null>(null);

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

  // Get enrollment status
  const { data: playerEnrollments } = usePlayerEnrollments();
  const enrollment = playerEnrollments?.find((e) => e.tour_id === id);
  const isEnrolled = enrollment?.status === "active";

  // Find the first open competition for registration status query
  const firstOpenCompetition = useMemo(() => {
    return competitions?.find(isCompetitionOpen) || null;
  }, [competitions, isCompetitionOpen]);

  // Get registration status for the first open competition
  const { data: registrationData, refetch: refetchRegistration } = useMyRegistration(
    firstOpenCompetition?.id || 0
  );

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
              className="w-full pl-10 pr-4 py-2.5 border-b border-soft-grey bg-transparent text-charcoal placeholder-charcoal/50 focus:outline-none focus:border-turf transition-colors"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {/* Show "Open" filter prominently if there are open competitions */}
            {hasOpenCompetitions && (
              <button
                onClick={() => setFilter("open")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                  filter === "open"
                    ? "text-coral border-b-2 border-coral"
                    : "text-charcoal/70 hover:text-coral"
                }`}
              >
                Live
              </button>
            )}
            {(["all", "upcoming", "past"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                  filter === f
                    ? "text-turf border-b-2 border-turf"
                    : "text-charcoal/70 hover:text-turf"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Competitions List */}
        {!competitions || competitions.length === 0 ? (
          <div className="text-center py-12 text-charcoal/70">
            <Calendar className="h-8 w-8 text-turf mx-auto mb-3" />
            <p className="text-sm mb-4">No competitions yet.</p>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="border-soft-grey text-charcoal hover:bg-rough/20"
            >
              Back to Tour
            </Button>
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="text-center py-12 text-charcoal/70">
            <Search className="h-8 w-8 text-turf mx-auto mb-3" />
            <p className="text-sm mb-4">No competitions match your search.</p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setFilter("all");
              }}
              variant="outline"
              className="border-soft-grey text-charcoal hover:bg-rough/20"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCompetitions).map(([month, comps]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-charcoal/70 uppercase tracking-wide mb-2">
                  {month}
                </h3>
                <div className="divide-y divide-soft-grey">
                  {comps.map((competition) => {
                    const compDate = new Date(competition.date);
                    compDate.setHours(0, 0, 0, 0);
                    const isUpcoming = compDate >= today;
                    const isToday = compDate.getTime() === today.getTime();
                    const isOpen = isCompetitionOpen(competition);

                    // Check registration status for this competition (only for the first open one)
                    const isThisCompetitionRegistered =
                      isOpen &&
                      firstOpenCompetition?.id === competition.id &&
                      registrationData?.registered;

                    return (
                      <div
                        key={competition.id}
                        className={`py-4 ${
                          isOpen
                            ? "border-l-4 border-l-coral pl-4 bg-coral/5"
                            : ""
                        }`}
                      >
                        <Link
                          to="/player/competitions/$competitionId"
                          params={{ competitionId: competition.id.toString() }}
                          className="flex items-center gap-3 group hover:bg-gray-50/50 transition-colors -mx-2 px-2 py-1 rounded"
                        >
                          {/* Competition Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {isOpen && (
                                <span className="text-xs font-semibold text-coral">
                                  LIVE
                                </span>
                              )}
                              {isThisCompetitionRegistered && (
                                <span className="text-xs font-semibold text-turf flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  JOINED
                                </span>
                              )}
                              {isToday && !isOpen && (
                                <span className="text-xs font-semibold text-coral">
                                  TODAY
                                </span>
                              )}
                              <h4 className="font-medium text-charcoal group-hover:text-fairway transition-colors truncate">
                                {competition.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-charcoal/70">
                              <div className="flex items-center gap-1">
                                <Calendar className={`h-4 w-4 ${isUpcoming ? "text-turf" : "text-charcoal/50"}`} />
                                <span>
                                  {new Date(competition.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              {competition.course_name && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-turf" />
                                  <span className="truncate">{competition.course_name}</span>
                                </div>
                              )}
                            </div>
                            {isOpen && competition.open_end && (
                              <p className="text-xs text-coral mt-1">
                                Open until{" "}
                                {new Date(competition.open_end).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>

                          <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
                        </Link>

                        {/* Quick Join button for open competitions */}
                        {isOpen && isEnrolled && !isThisCompetitionRegistered && (
                          <div className="mt-3">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setJoinCompetition(competition);
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-turf hover:bg-fairway text-scorecard rounded-lg font-medium text-sm transition-colors"
                            >
                              <Users className="h-4 w-4" />
                              Join This Round
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Join Competition Flow Modal */}
      {joinCompetition && (
        <JoinCompetitionFlow
          isOpen={!!joinCompetition}
          onClose={() => setJoinCompetition(null)}
          competitionId={joinCompetition.id}
          competitionName={joinCompetition.name}
          courseName={joinCompetition.course_name}
          openUntil={joinCompetition.open_end}
          onSuccess={() => {
            refetchRegistration();
            refetchCompetitions();
          }}
        />
      )}
    </PlayerPageLayout>
  );
}
