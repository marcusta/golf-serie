import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/api/player-profile";
import { useMyToursAndSeries } from "@/api/player-profile";
import { useActiveRounds } from "@/api/tour-registration";
import { useMyRounds } from "@/api/player-profile";
import {
  Trophy,
  Calendar,
  Flag,
  TrendingUp,
  Play,
  ChevronRight,
  Award,
  BarChart3,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useMemo } from "react";
import { RoundList } from "@/components/rounds/RoundList";

export function Dashboard() {
  useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: toursAndSeries, isLoading: toursLoading } = useMyToursAndSeries();
  const { data: activeRounds, isLoading: activeRoundsLoading } = useActiveRounds();
  const { data: recentRounds, isLoading: recentRoundsLoading } = useMyRounds(5);

  const isLoading = profileLoading || toursLoading || activeRoundsLoading || recentRoundsLoading;

  // Calculate this week's upcoming competitions from active rounds
  const upcomingThisWeek = useMemo(() => {
    if (!activeRounds) return [];

    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return activeRounds
      .filter(round => {
        // Filter to only upcoming (not currently playing)
        if (round.status === "playing") return false;

        // Check if competition has open_until date in the next week
        if (round.open_until) {
          const openUntil = new Date(round.open_until);
          return openUntil >= now && openUntil <= oneWeekLater;
        }
        return false;
      })
      .slice(0, 5); // Limit to 5 upcoming
  }, [activeRounds]);

  // Get active/playing rounds
  const currentRounds = useMemo(() => {
    if (!activeRounds) return [];
    return activeRounds.filter(round => round.status === "playing");
  }, [activeRounds]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-turf" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-coral mx-auto mb-4" />
          <h2 className="text-display-sm text-fairway mb-4">Profile Not Found</h2>
          <p className="text-body-md text-charcoal mb-6">
            Please complete your profile to access the dashboard.
          </p>
          <Link
            to="/player/profile"
            className="inline-block bg-turf hover:bg-turf/90 text-scorecard px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-display-lg text-charcoal mb-2">
            Welcome back, {profile.display_name || profile.name}!
          </h1>
          <p className="text-body-lg text-charcoal/70">
            Here's your golf activity overview
          </p>
        </div>

        {/* Quick Stats - Inline, no container */}
        <div className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-display-lg font-bold text-turf">{profile.handicap.toFixed(1)}</div>
              <div className="text-body-sm text-charcoal/70">Handicap</div>
            </div>
            <div className="text-center">
              <div className="text-display-lg font-bold text-charcoal">{profile.total_rounds}</div>
              <div className="text-body-sm text-charcoal/70">Total Rounds</div>
            </div>
            <div className="text-center">
              <div className="text-display-lg font-bold text-charcoal">{toursAndSeries?.tours.length || 0}</div>
              <div className="text-body-sm text-charcoal/70">Active Tours</div>
            </div>
            <div className="text-center">
              <div className="text-display-lg font-bold text-charcoal">
                {toursAndSeries?.tours.find(t => t.position)?.position || "—"}
              </div>
              <div className="text-body-sm text-charcoal/70">Best Position</div>
            </div>
          </div>
        </div>

        {/* Active Rounds Section */}
        {currentRounds.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-5 w-5 text-flag" />
              <h2 className="text-body-xl font-bold text-charcoal">Active Rounds</h2>
            </div>
            <div className="bg-scorecard rounded-xl overflow-hidden divide-y divide-soft-grey">
              {currentRounds.map((round) => (
                <Link
                  key={round.tee_time_id}
                  to="/player/competitions/$competitionId/tee-times/$teeTimeId"
                  params={{
                    competitionId: round.competition_id.toString(),
                    teeTimeId: round.tee_time_id.toString(),
                  }}
                  className="block px-5 py-4 hover:bg-turf/5 transition-colors border-l-4 border-flag"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-charcoal mb-1">
                        {round.competition_name}
                      </div>
                      <div className="flex items-center gap-3 text-body-sm text-charcoal/70 mb-2">
                        <span>{round.course_name}</span>
                        <span>•</span>
                        <span>{round.tour_name}</span>
                      </div>
                      <div className="text-body-sm text-turf font-medium">
                        {round.holes_played} holes played • {round.current_score}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming This Week */}
        {upcomingThisWeek.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-coral" />
              <h2 className="text-body-xl font-bold text-charcoal">Upcoming This Week</h2>
            </div>
            <div className="bg-scorecard rounded-xl overflow-hidden divide-y divide-soft-grey">
              {upcomingThisWeek.map((round) => {
                const openUntil = round.open_until ? new Date(round.open_until) : null;
                const formattedDate = openUntil
                  ? openUntil.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  : "TBD";

                return (
                  <Link
                    key={round.competition_id}
                    to="/player/competitions/$competitionId"
                    params={{ competitionId: round.competition_id.toString() }}
                    search={{ view: "teams" }}
                    className="block px-5 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-charcoal mb-1">
                          {round.competition_name}
                        </div>
                        <div className="flex items-center gap-3 text-body-sm text-charcoal/70 mb-1">
                          <span>{round.course_name}</span>
                        </div>
                        <div className="text-body-sm text-coral font-medium">
                          {formattedDate}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* My Tours */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-turf" />
              <h2 className="text-body-xl font-bold text-charcoal">My Tours</h2>
            </div>
            <Link
              to="/player/tours"
              className="text-turf hover:underline text-body-sm font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {toursAndSeries && toursAndSeries.tours.length > 0 ? (
            <div className="bg-scorecard rounded-xl overflow-hidden divide-y divide-soft-grey">
              {toursAndSeries.tours.map((tour) => (
                <Link
                  key={tour.tour_id}
                  to="/player/tours/$tourId"
                  params={{ tourId: tour.tour_id.toString() }}
                  className="block px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-charcoal">{tour.tour_name}</h3>
                        {tour.category_name && (
                          <span className="inline-block px-2 py-0.5 bg-coral/10 text-coral text-label-xs rounded">
                            {tour.category_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-6 text-body-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-charcoal/60">Position:</span>
                      <span className="font-semibold text-turf">
                        {tour.position || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-charcoal/60">Points:</span>
                      <span className="font-semibold text-charcoal">
                        {tour.total_points || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-charcoal/60">Rounds:</span>
                      <span className="font-semibold text-charcoal">
                        {tour.competitions_played}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-charcoal/60">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-40" />
              <h3 className="text-body-lg font-medium mb-2">No Active Tours</h3>
              <p className="text-body-sm mb-4">Join a tour to start competing</p>
              <Link
                to="/player/tours"
                className="inline-block bg-turf hover:bg-turf/90 text-scorecard px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Browse Tours
              </Link>
            </div>
          )}
        </div>

        {/* Recent Results */}
        {recentRounds && recentRounds.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-charcoal" />
                <h2 className="text-body-xl font-bold text-charcoal">Recent Results</h2>
              </div>
              <Link
                to="/player/rounds"
                className="text-turf hover:underline text-body-sm font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <RoundList rounds={recentRounds} />
          </div>
        )}

        {/* Quick Links - Simplified with dividers */}
        <div className="bg-scorecard rounded-xl overflow-hidden">
          <div className="divide-y divide-soft-grey">
            <Link
              to="/player/tours"
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <Flag className="h-5 w-5 text-turf" />
              <span className="font-medium text-charcoal flex-1">Browse Tours</span>
              <ChevronRight className="h-5 w-5 text-charcoal/40" />
            </Link>
            <Link
              to="/player/competitions"
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <Calendar className="h-5 w-5 text-coral" />
              <span className="font-medium text-charcoal flex-1">All Competitions</span>
              <ChevronRight className="h-5 w-5 text-charcoal/40" />
            </Link>
            <Link
              to="/player/series"
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <Award className="h-5 w-5 text-sky" />
              <span className="font-medium text-charcoal flex-1">Series</span>
              <ChevronRight className="h-5 w-5 text-charcoal/40" />
            </Link>
            <Link
              to="/player/profile"
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-charcoal" />
              <span className="font-medium text-charcoal flex-1">My Profile</span>
              <ChevronRight className="h-5 w-5 text-charcoal/40" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
