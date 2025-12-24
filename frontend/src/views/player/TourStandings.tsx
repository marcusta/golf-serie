import { useParams, useNavigate } from "@tanstack/react-router";
import { useTour, useTourStandings, useTourCompetitions } from "@/api/tours";
import type { TourPlayerCompetition } from "@/api/tours";
import {
  Trophy,
  AlertCircle,
  RefreshCw,
  Share,
  Download,
  Medal,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import { useState } from "react";

interface EnhancedCompetition extends TourPlayerCompetition {
  is_future?: boolean;
  not_participated?: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top 3 cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
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

export default function TourStandings() {
  const { tourId } = useParams({ from: "/player/tours/$tourId/standings" });
  const navigate = useNavigate();

  const id = parseInt(tourId);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<number>>(
    new Set()
  );

  const {
    data: tour,
    isLoading: tourLoading,
    error: tourError,
  } = useTour(id);

  const {
    data: standings,
    isLoading: standingsLoading,
    error: standingsError,
    refetch: refetchStandings,
  } = useTourStandings(id);

  const {
    data: allCompetitions,
    isLoading: competitionsLoading,
    error: competitionsError,
  } = useTourCompetitions(id);

  const handleShare = async () => {
    if (navigator.share && tour) {
      try {
        await navigator.share({
          title: `${tour.name} Standings`,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleExport = () => {
    if (!standings?.player_standings) return;

    const csvContent = [
      ["Position", "Player", "Points", "Competitions Played"].join(","),
      ...standings.player_standings.map((standing) =>
        [
          standing.position,
          `"${standing.player_name}"`,
          standing.total_points,
          standing.competitions_played,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tour?.name || "tour"}-standings.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (tourLoading || standingsLoading || competitionsLoading)
    return <LoadingSkeleton />;

  if (tourError) {
    return (
      <ErrorState
        title="Tour Not Found"
        message="The tour you're looking for doesn't exist or may have been removed."
      />
    );
  }

  if (standingsError || competitionsError) {
    return (
      <ErrorState
        title="Error Loading Standings"
        message="Unable to load player standings. Please try again."
        onRetry={() => refetchStandings()}
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

  if (!standings?.player_standings?.length) {
    return (
      <PlayerPageLayout title="Player Standings">
        {/* Sub-header with Page Title */}
        <div className="bg-scorecard border-b border-soft-grey shadow-sm">
          <div className="container mx-auto px-4">
            <div className="py-4">
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Player Standings
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                {tour.name}
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Trophy className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Standings Available
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Player standings will appear here once competitions are completed.
            </p>
            <Button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-turf hover:bg-fairway text-scorecard rounded-xl transition-colors font-medium"
            >
              Back to Tour Overview
            </Button>
          </div>
        </main>
      </PlayerPageLayout>
    );
  }

  const togglePlayerDetails = (playerId: number) => {
    const newExpanded = new Set(expandedPlayers);
    if (newExpanded.has(playerId)) {
      newExpanded.delete(playerId);
    } else {
      newExpanded.add(playerId);
    }
    setExpandedPlayers(newExpanded);
  };

  const handleCompetitionClick = (
    competitionId: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    navigate({
      to: `/player/competitions/${competitionId}`,
    });
  };

  // Format score relative to par for display
  const formatScore = (score: number) => {
    if (score === 0) return "E";
    return score > 0 ? `+${score}` : score.toString();
  };

  // Create enhanced player standings with all competitions
  const getEnhancedPlayerStandings = () => {
    if (!standings || !allCompetitions) return [];

    return standings.player_standings.map((playerStanding) => {
      const participatedCompetitions = new Map(
        playerStanding.competitions.map((comp) => [comp.competition_id, comp])
      );

      const enhancedCompetitions = allCompetitions.map((competition) => {
        const participated = participatedCompetitions.get(competition.id);

        if (participated) {
          return participated;
        } else {
          const competitionDate = new Date(competition.date);
          const today = new Date();
          today.setHours(23, 59, 59, 999);

          const isFutureCompetition = competitionDate > today;

          return {
            competition_id: competition.id,
            competition_name: competition.name,
            competition_date: competition.date,
            points: 0,
            position: 0,
            score_relative_to_par: 0,
            is_future: isFutureCompetition,
            not_participated: !isFutureCompetition,
          };
        }
      });

      return {
        ...playerStanding,
        competitions: enhancedCompetitions,
      };
    });
  };

  const topThree = standings.player_standings.slice(0, 3);
  const enhancedPlayerStandings = getEnhancedPlayerStandings();

  return (
    <PlayerPageLayout title="Player Standings">
      {/* Sub-header with export functionality */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Player Standings
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                {tour.name}
                {standings.point_template && (
                  <span className="ml-2 text-xs bg-turf/10 text-turf px-2 py-0.5 rounded">
                    {standings.point_template.name}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="text-charcoal border-soft-grey hover:bg-rough/20"
              >
                <Share className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="text-charcoal border-soft-grey hover:bg-rough/20"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Top 3 Summary Cards */}
        {topThree.length > 0 && (
          <section className="mb-8">
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-6">
              Top Performers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((standing, index) => (
                <div
                  key={standing.player_id}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 hover:transform hover:-translate-y-1 ${
                    index === 0
                      ? "bg-gradient-to-br from-coral/10 to-coral/5 border-coral shadow-lg shadow-coral/20 hover:shadow-xl hover:shadow-coral/30"
                      : index === 1
                      ? "bg-gradient-to-br from-slate-100/50 to-slate-50/30 border-slate-300 hover:shadow-lg"
                      : "bg-gradient-to-br from-turf/10 to-turf/5 border-turf hover:shadow-lg"
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 ${
                        index === 0
                          ? "bg-coral text-scorecard"
                          : index === 1
                          ? "bg-slate-400 text-scorecard"
                          : "bg-turf text-scorecard"
                      }`}
                    >
                      {index === 0 ? (
                        <Medal className="h-6 w-6" />
                      ) : (
                        <span className="text-lg font-bold">
                          {standing.position}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-label-lg font-semibold text-charcoal truncate">
                        {standing.player_name}
                      </h3>
                      <p className="text-body-sm text-charcoal/70">
                        {standing.competitions_played} competition
                        {standing.competitions_played !== 1 ? "s" : ""} played
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-display-lg font-display font-bold text-charcoal">
                      {standing.total_points}
                    </div>
                    <div className="text-body-sm text-charcoal/70 font-medium">
                      points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Enhanced Standings with Expandable Details */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-display-sm font-display font-semibold text-charcoal">
              Complete Standings
            </h2>
            <span className="text-body-sm text-charcoal/70">
              {standings.player_standings.length} player
              {standings.player_standings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Clean Hierarchical List */}
          <div className="bg-scorecard rounded-xl shadow-sm border border-soft-grey/30 overflow-hidden">
            {enhancedPlayerStandings.map((standing, index) => (
              <div key={standing.player_id}>
                {/* Player Row */}
                <div
                  className={`relative cursor-pointer transition-colors duration-150 hover:bg-rough/30 ${
                    index > 0 ? "border-t border-slate-100" : ""
                  }`}
                  onClick={() => togglePlayerDetails(standing.player_id)}
                >
                  <div className="flex items-center gap-4 p-5">
                    {/* Position Badge */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        standing.position === 1
                          ? "bg-amber-100 text-amber-700"
                          : standing.position === 2
                          ? "bg-slate-200 text-slate-600"
                          : standing.position === 3
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {standing.position}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-charcoal leading-tight mb-1">
                        {standing.player_name}
                      </h3>
                      <p className="text-sm text-slate-500 leading-tight">
                        {standing.competitions_played} of{" "}
                        {standings.total_competitions} competitions
                      </p>
                    </div>

                    {/* Stats - Desktop */}
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-bold text-charcoal leading-tight">
                          {standing.total_points}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide leading-tight">
                          Points
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-charcoal leading-tight">
                          {standing.competitions_played}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide leading-tight">
                          Played
                        </div>
                      </div>
                    </div>

                    {/* Stats - Mobile */}
                    <div className="sm:hidden text-right">
                      <div className="text-lg font-bold text-charcoal leading-tight">
                        {standing.total_points}
                      </div>
                      <div className="text-xs text-slate-500 leading-tight">
                        pts
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <div
                      className={`w-5 h-5 flex items-center justify-center transition-transform duration-200 text-slate-400 ${
                        expandedPlayers.has(standing.player_id)
                          ? "rotate-90"
                          : ""
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Competition Details - Expandable */}
                <div
                  className={`bg-slate-50 border-t border-slate-100 overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedPlayers.has(standing.player_id)
                      ? "max-h-[1000px] opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div
                    className={`pl-16 pr-5 space-y-1 transition-all duration-300 ease-in-out ${
                      expandedPlayers.has(standing.player_id) ? "py-4" : "py-0"
                    }`}
                  >
                    {expandedPlayers.has(standing.player_id) &&
                      standing.competitions.map((competition) => {
                        const enhancedComp = competition as EnhancedCompetition;
                        const isFuture = enhancedComp.is_future;
                        const notParticipated = enhancedComp.not_participated;

                        return (
                          <div
                            key={competition.competition_id}
                            className={`group flex items-center gap-3 py-3 border-b border-slate-200/50 last:border-b-0 transition-colors ${
                              isFuture || notParticipated
                                ? "cursor-default"
                                : "cursor-pointer hover:bg-slate-100/50"
                            }`}
                            onClick={
                              isFuture || notParticipated
                                ? undefined
                                : (e) =>
                                    handleCompetitionClick(
                                      competition.competition_id,
                                      e
                                    )
                            }
                          >
                            {/* Position Badge */}
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                                isFuture
                                  ? "bg-blue-100 text-blue-600"
                                  : notParticipated
                                  ? "bg-red-100 text-red-600"
                                  : competition.position === 1
                                  ? "bg-amber-100 text-amber-700"
                                  : competition.position === 2
                                  ? "bg-slate-200 text-slate-600"
                                  : competition.position === 3
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isFuture
                                ? "-"
                                : notParticipated
                                ? "x"
                                : competition.position}
                            </div>

                            {/* Competition Info */}
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-sm font-medium leading-tight mb-1 ${
                                  isFuture
                                    ? "text-blue-800"
                                    : notParticipated
                                    ? "text-red-800"
                                    : "text-charcoal"
                                }`}
                              >
                                {competition.competition_name}
                              </div>
                              <div
                                className={`text-xs leading-tight ${
                                  isFuture
                                    ? "text-blue-600"
                                    : notParticipated
                                    ? "text-red-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {new Date(
                                  competition.competition_date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                            </div>

                            {/* Score and Points */}
                            <div className="text-right flex items-center gap-4">
                              {!isFuture && !notParticipated && (
                                <div className="text-sm text-charcoal/70">
                                  {formatScore(competition.score_relative_to_par)}
                                </div>
                              )}
                              <div>
                                {isFuture || notParticipated ? (
                                  <div
                                    className={`text-lg font-bold ${
                                      isFuture
                                        ? "text-blue-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    -
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm font-bold text-charcoal leading-tight">
                                      {competition.points}
                                    </div>
                                    <div className="text-xs text-slate-500 leading-tight">
                                      pts
                                    </div>
                                  </>
                                )}
                              </div>
                              {!isFuture && !notParticipated && (
                                <div className="w-4 h-4 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </PlayerPageLayout>
  );
}
