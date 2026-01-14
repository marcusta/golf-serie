import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/api/player-profile";
import { useMyToursAndSeries } from "@/api/player-profile";
import { useActiveRounds } from "@/api/tour-registration";
import { useMyRounds } from "@/api/player-profile";
import { useMyGames } from "@/api/games";
import {
  Trophy,
  ChevronRight,
  AlertCircle,
  Loader2,
  Flag,
  Calendar,
  Award,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { RoundList } from "@/components/rounds/RoundList";

export function Dashboard() {
  useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: toursAndSeries, isLoading: toursLoading } =
    useMyToursAndSeries();
  const { data: activeRounds, isLoading: activeRoundsLoading } =
    useActiveRounds();
  const { data: recentRounds, isLoading: recentRoundsLoading } = useMyRounds(5);
  const { data: myGames, isLoading: gamesLoading } = useMyGames();

  const isLoading =
    profileLoading ||
    toursLoading ||
    activeRoundsLoading ||
    recentRoundsLoading ||
    gamesLoading;

  // Calculate this week's upcoming competitions from active rounds
  const upcomingThisWeek = useMemo(() => {
    if (!activeRounds) return [];

    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return activeRounds
      .filter((round) => {
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
    return activeRounds.filter((round) => round.status === "playing");
  }, [activeRounds]);

  // Get ongoing casual games (not completed)
  const activeGames = useMemo(() => {
    if (!myGames) return [];
    return myGames.filter((game) => game.status !== "completed");
  }, [myGames]);

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
          <h2 className="text-display-sm text-fairway mb-4">
            Profile Not Found
          </h2>
          <p className="text-body-md text-charcoal mb-6">
            Please complete your profile to access the dashboard.
          </p>
          <Link
            to="/player/profile"
            className="inline-block bg-turf hover:bg-turf/90 text-scorecard px-6 py-3 rounded font-semibold transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rough/40 via-scorecard/95 to-scorecard">
      {/* Play Golf Button - Circular, Centered at Top, Floating Above Everything */}
      <Link to="/player/games/new" className="group block fixed left-1/2 -translate-x-1/2 z-50" style={{ top: '5px' }}>
        <div
          className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-turf via-turf to-turf/80 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            boxShadow:
              "0 12px 28px rgba(45, 106, 79, 0.4), 0 6px 12px rgba(0, 0, 0, 0.15), inset 0 -3px 8px rgba(0, 0, 0, 0.2), inset 0 3px 6px rgba(255, 255, 255, 0.3)",
          }}
        >
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent opacity-60" />

          {/* Text - Two Lines */}
          <div className="relative z-10 text-center leading-tight">
            <div className="text-base md:text-lg font-bold text-scorecard drop-shadow-md">
              Play
            </div>
            <div className="text-base md:text-lg font-bold text-scorecard drop-shadow-md">
              Golf
            </div>
          </div>
        </div>
      </Link>

      {/* Hero Section with Image */}
      <div className="relative h-[280px] md:h-[300px] overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/splash-images/Golf-Lake.jpg')`,
          }}
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/50 to-charcoal/80 opacity-40" />

        {/* Welcome Text */}
        <div className="relative h-full flex flex-col justify-end px-4 pb-16">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-[2rem] md:text-[2.5rem] text-scorecard drop-shadow-lg leading-tight">
              Welcome back,
              <br />
              <span className="font-bold">
                {profile.display_name || profile.name}
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* Stats Card - Overlapping Hero */}
      <div className="container mx-auto px-3 max-w-6xl relative z-10 -mt-12 mb-8">
        <div className="bg-white rounded-2xl shadow-lg py-5 px-3">
          <div className="flex items-center justify-center gap-3 md:gap-8">
            {/* Handicap Circle */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded bg-gradient-to-br from-turf to-turf/80 flex flex-col items-center justify-center">
                <div className="text-xl md:text-3xl font-bold text-scorecard">
                  {profile.handicap.toFixed(1)}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/80 mt-2">HCP</div>
            </div>

            {/* Total Rounds Circle */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded bg-gradient-to-br from-charcoal to-charcoal/80 flex flex-col items-center justify-center">
                <div className="text-xl md:text-3xl font-bold text-scorecard">
                  {profile.total_rounds}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/80 mt-2">Rounds</div>
            </div>

            {/* Active Tours Circle */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded bg-gradient-to-br from-coral to-coral/80 flex flex-col items-center justify-center">
                <div className="text-xl md:text-3xl font-bold text-scorecard">
                  {toursAndSeries?.tours.length || 0}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/80 mt-2">Tours</div>
            </div>

            {/* Best Position Circle */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded bg-gradient-to-br from-sky to-sky/80 flex flex-col items-center justify-center">
                <div className="text-xl md:text-3xl font-bold text-scorecard">
                  {toursAndSeries?.tours.find((t) => t.position)?.position ||
                    "—"}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/80 mt-2">
                Best Pos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8 max-w-6xl">
        {/* My Casual Games Section - Horizontal Scroll on Mobile */}
        {activeGames.length > 0 && (
          <div className="mb-8 -mx-4 md:mx-0">
            <div className="flex items-center justify-between mb-4 px-4 md:px-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal">
                Active Rounds
              </h2>
              <Link
                to="/player/games"
                className="text-turf hover:underline text-body-sm font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {/* Horizontal scroll on mobile */}
            <div className="md:hidden bg-soft-grey/30 rounded-2xl shadow-lg p-4">
              <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-3" style={{ minWidth: "min-content" }}>
                  {activeGames.map((game) => {
                    const gameDate = game.scheduled_date || game.started_at;
                    const formattedDate = gameDate
                      ? new Date(gameDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : null;
                    return (
                      <Link
                        key={game.id}
                        to="/player/games/$gameId/play"
                        params={{ gameId: game.id.toString() }}
                        className="block bg-white rounded px-4 py-4 border-l-4 border-turf hover:border-turf/80 transition-all flex-shrink-0"
                        style={{ width: "280px" }}
                      >
                        <div className="font-semibold text-charcoal mb-2 line-clamp-1">
                          {game.name || "Casual Round"}
                        </div>
                        <div className="text-body-sm text-charcoal/70 mb-1 line-clamp-1">
                          {game.course_name}
                        </div>
                        {formattedDate && (
                          <div className="text-body-sm text-charcoal/60 mb-3">
                            {formattedDate}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-body-sm text-turf font-semibold">
                            {game.my_holes_played ?? 0} holes
                          </div>
                          <div className="text-body-lg font-bold text-charcoal">
                            {game.my_current_score || "E"}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Desktop vertical list */}
            <div className="hidden md:block bg-soft-grey/30 rounded-2xl shadow-lg p-6">
              <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
                {activeGames.map((game) => {
                  const gameDate = game.scheduled_date || game.started_at;
                  const formattedDate = gameDate
                    ? new Date(gameDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : null;
                  return (
                    <Link
                      key={game.id}
                      to="/player/games/$gameId/play"
                      params={{ gameId: game.id.toString() }}
                      className="block px-5 py-4 hover:bg-turf/5 transition-colors border-l-4 border-turf hover:border-turf/80"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-charcoal mb-1">
                            {game.name || "Casual Round"}
                          </div>
                          <div className="text-body-sm text-charcoal/70 mb-1">
                            {game.course_name}
                          </div>
                          {formattedDate && (
                            <div className="text-body-sm text-charcoal/60 mb-2">
                              {formattedDate}
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <span className="text-body-sm text-turf font-medium">
                              {game.my_holes_played ?? 0} holes
                            </span>
                            <span className="text-body-sm font-bold text-charcoal">
                              {game.my_current_score || "E"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0 mt-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Rounds Section - Horizontal Scroll on Mobile */}
        {currentRounds.length > 0 && (
          <div className="mb-8 -mx-4 md:mx-0">
            <div className="mb-4 px-4 md:px-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal mb-4">
                Active Competition Rounds
              </h2>
            </div>
            {/* Horizontal scroll on mobile */}
            <div className="md:hidden bg-soft-grey/30 rounded-2xl shadow-lg p-4">
              <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-3" style={{ minWidth: "min-content" }}>
                  {currentRounds.map((round) => (
                    <Link
                      key={round.tee_time_id}
                      to="/player/competitions/$competitionId/tee-times/$teeTimeId"
                      params={{
                        competitionId: round.competition_id.toString(),
                        teeTimeId: round.tee_time_id.toString(),
                      }}
                      className="block bg-white rounded px-4 py-4 border-l-4 border-flag hover:border-flag/80 transition-all flex-shrink-0"
                      style={{ width: "280px" }}
                    >
                      <div className="font-semibold text-charcoal mb-2 line-clamp-1">
                        {round.competition_name}
                      </div>
                      <div className="text-body-sm text-charcoal/70 mb-2 line-clamp-1">
                        {round.course_name}
                      </div>
                      <div className="text-body-sm text-charcoal/60 mb-3 line-clamp-1">
                        {round.tour_name}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-body-sm text-flag font-semibold">
                          {round.holes_played} holes
                        </div>
                        <div className="text-body-lg font-bold text-charcoal">
                          {round.current_score}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {/* Desktop vertical list */}
            <div className="hidden md:block bg-soft-grey/30 rounded-2xl shadow-lg p-6">
              <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
                {currentRounds.map((round) => (
                  <Link
                    key={round.tee_time_id}
                    to="/player/competitions/$competitionId/tee-times/$teeTimeId"
                    params={{
                      competitionId: round.competition_id.toString(),
                      teeTimeId: round.tee_time_id.toString(),
                    }}
                    className="block px-5 py-4 hover:bg-turf/5 transition-colors border-l-4 border-flag hover:border-flag/80"
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
                          {round.holes_played} holes played •{" "}
                          {round.current_score}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming This Week */}
        {upcomingThisWeek.length > 0 && (
          <div className="mb-8">
            <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal mb-4">
                Upcoming This Week
              </h2>
              <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
                {upcomingThisWeek.map((round) => {
                  const openUntil = round.open_until
                    ? new Date(round.open_until)
                    : null;
                  const formattedDate = openUntil
                    ? openUntil.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "TBD";

                  return (
                    <Link
                      key={round.competition_id}
                      to="/player/competitions/$competitionId"
                      params={{ competitionId: round.competition_id.toString() }}
                      search={{ view: "teams" }}
                      className="block px-5 py-4 hover:bg-coral/5 transition-colors border-l-4 border-coral hover:border-coral/80"
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
          </div>
        )}

        {/* My Tours - Horizontal Scroll */}
        <div className="mb-8 -mx-4 md:mx-0">
          <div className="flex items-center justify-between mb-4 px-4 md:px-0">
            <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal">My Tours</h2>
            <Link
              to="/player/tours"
              className="text-turf hover:underline text-body-sm font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {toursAndSeries && toursAndSeries.tours.length > 0 ? (
            <>
              {/* Horizontal scroll on mobile */}
              <div className="md:hidden bg-soft-grey/30 rounded-2xl shadow-lg px-4 py-4">
                <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex gap-3" style={{ minWidth: "min-content" }}>
                    {toursAndSeries.tours.map((tour) => (
                      <Link
                        key={tour.tour_id}
                        to="/player/tours/$tourId"
                        params={{ tourId: tour.tour_id.toString() }}
                        className="block bg-white rounded px-4 py-4 border-l-4 border-turf hover:border-turf/80 transition-all flex-shrink-0"
                        style={{ width: "280px" }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-bold text-charcoal line-clamp-1 flex-1">
                            {tour.tour_name}
                          </h3>
                          {tour.category_name && (
                            <span className="inline-block px-2 py-0.5 bg-coral/20 text-coral text-label-xs rounded font-medium flex-shrink-0">
                              {tour.category_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-body-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-charcoal/60">Pos:</span>
                            <span className="font-bold text-turf text-body-md">
                              {tour.position || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-charcoal/60">Pts:</span>
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
                </div>
              </div>
              {/* Desktop vertical list */}
              <div className="hidden md:block bg-soft-grey/30 rounded-2xl shadow-lg p-6">
                <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
                  {toursAndSeries.tours.map((tour) => (
                    <Link
                      key={tour.tour_id}
                      to="/player/tours/$tourId"
                      params={{ tourId: tour.tour_id.toString() }}
                      className="block px-5 py-4 hover:bg-turf/5 transition-colors border-l-4 border-turf hover:border-turf/80"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-charcoal">
                              {tour.tour_name}
                            </h3>
                            {tour.category_name && (
                              <span className="inline-block px-2 py-0.5 bg-coral/20 text-coral text-label-xs rounded font-medium">
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
                          <span className="font-bold text-turf text-body-md">
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
              </div>
            </>
          ) : (
            <div className="bg-scorecard rounded-2xl shadow-lg text-center py-12 text-charcoal/60 mx-4 md:mx-0">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-40" />
              <h3 className="text-body-lg font-medium mb-2">No Active Tours</h3>
              <p className="text-body-sm mb-4">
                Join a tour to start competing
              </p>
              <Link
                to="/player/tours"
                className="inline-block bg-turf hover:bg-turf/90 text-scorecard px-6 py-3 rounded font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                Browse Tours
              </Link>
            </div>
          )}
        </div>

        {/* Recent Results */}
        {recentRounds && recentRounds.length > 0 && (
          <div className="mb-8">
            <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal">
                  Recent Results
                </h2>
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
          </div>
        )}

        {/* Quick Links - Enhanced Background Zone */}
        <div className="-mx-4 md:mx-0 px-4 md:px-0 py-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal mb-4">
            Quick Access
          </h2>
          <div className="bg-scorecard rounded overflow-hidden shadow-lg">
            <div className="divide-y divide-soft-grey">
              <Link
                to="/player/tours"
                className="flex items-center gap-3 px-5 py-4 hover:bg-turf/5 transition-colors"
              >
                <div className="bg-turf/10 p-2 rounded">
                  <Flag className="h-5 w-5 text-turf" />
                </div>
                <span className="font-medium text-charcoal flex-1">
                  Browse Tours
                </span>
                <ChevronRight className="h-5 w-5 text-charcoal/40" />
              </Link>
              <Link
                to="/player/competitions"
                className="flex items-center gap-3 px-5 py-4 hover:bg-coral/5 transition-colors"
              >
                <div className="bg-coral/10 p-2 rounded">
                  <Calendar className="h-5 w-5 text-coral" />
                </div>
                <span className="font-medium text-charcoal flex-1">
                  All Competitions
                </span>
                <ChevronRight className="h-5 w-5 text-charcoal/40" />
              </Link>
              <Link
                to="/player/series"
                className="flex items-center gap-3 px-5 py-4 hover:bg-sky/5 transition-colors"
              >
                <div className="bg-sky/10 p-2 rounded">
                  <Award className="h-5 w-5 text-sky" />
                </div>
                <span className="font-medium text-charcoal flex-1">Series</span>
                <ChevronRight className="h-5 w-5 text-charcoal/40" />
              </Link>
              <Link
                to="/player/profile"
                className="flex items-center gap-3 px-5 py-4 hover:bg-charcoal/5 transition-colors"
              >
                <div className="bg-charcoal/10 p-2 rounded">
                  <TrendingUp className="h-5 w-5 text-charcoal" />
                </div>
                <span className="font-medium text-charcoal flex-1">
                  My Profile
                </span>
                <ChevronRight className="h-5 w-5 text-charcoal/40" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
