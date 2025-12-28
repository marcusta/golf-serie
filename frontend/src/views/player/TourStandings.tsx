import { useParams, useNavigate } from "@tanstack/react-router";
import { useTour, useTourStandings, useTourCompetitions } from "@/api/tours";
import type { TourPlayerCompetition, TourCategory } from "@/api/tours";
import {
  Trophy,
  AlertCircle,
  RefreshCw,
  Share,
  Download,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import { useState, useEffect } from "react";

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [isFirstCategorySet, setIsFirstCategorySet] = useState(false);
  const [selectedScoringType, setSelectedScoringType] = useState<"gross" | "net" | undefined>(undefined);

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
  } = useTourStandings(id, selectedCategoryId, selectedScoringType);

  const {
    data: allCompetitions,
    isLoading: competitionsLoading,
    error: competitionsError,
  } = useTourCompetitions(id);

  // Set first category as default when standings load
  useEffect(() => {
    if (!isFirstCategorySet && standings?.categories && standings.categories.length > 0 && selectedCategoryId === undefined) {
      setSelectedCategoryId(standings.categories[0].id);
      setIsFirstCategorySet(true);
    }
  }, [standings?.categories, isFirstCategorySet, selectedCategoryId]);

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
                  <span className="text-charcoal/50"> · {standings.point_template.name}</span>
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

          {/* Filters Row: Category dropdown (left) + Scoring type pills (right) */}
          {(standings.categories && standings.categories.length > 1) || standings.scoring_mode === "both" ? (
            <div className="flex items-center justify-between gap-4 pb-4">
              {/* Category Dropdown */}
              {standings.categories && standings.categories.length > 1 ? (
                <Select
                  value={selectedCategoryId?.toString() ?? ""}
                  onValueChange={(value) => setSelectedCategoryId(Number(value))}
                >
                  <SelectTrigger className="w-auto min-w-[120px] pr-4 bg-scorecard border-soft-grey text-charcoal">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-scorecard border-soft-grey">
                    {standings.categories.map((category: TourCategory) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                        className="text-charcoal"
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div /> /* Spacer when no categories */
              )}

              {/* Scoring Type Pills */}
              {standings.scoring_mode === "both" && (
                <div className="flex rounded-lg overflow-hidden border border-soft-grey">
                  <button
                    onClick={() => setSelectedScoringType("gross")}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      (selectedScoringType === "gross" || (!selectedScoringType && standings.selected_scoring_type === "gross"))
                        ? "bg-turf text-scorecard"
                        : "bg-scorecard text-charcoal hover:bg-rough/30"
                    }`}
                  >
                    Gross
                  </button>
                  <button
                    onClick={() => setSelectedScoringType("net")}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-soft-grey ${
                      (selectedScoringType === "net" || (!selectedScoringType && standings.selected_scoring_type === "net"))
                        ? "bg-turf text-scorecard"
                        : "bg-scorecard text-charcoal hover:bg-rough/30"
                    }`}
                  >
                    Net
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Standings List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">
              Standings
            </h2>
            <span className="text-body-sm text-charcoal/70">
              {standings.player_standings.length} player
              {standings.player_standings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Clean List with Dividers */}
          <div className="divide-y divide-soft-grey">
            {enhancedPlayerStandings.map((standing) => (
              <div key={standing.player_id}>
                {/* Player Row */}
                <div
                  className={`cursor-pointer transition-colors hover:bg-gray-50/50 ${
                    standing.position === 1 ? "border-l-4 border-l-coral bg-coral/5" : ""
                  }`}
                  onClick={() => togglePlayerDetails(standing.player_id)}
                >
                  <div className="flex items-center gap-4 py-4 px-4">
                    {/* Position - Plain colored text */}
                    <div
                      className={`w-6 text-lg font-bold ${
                        standing.position === 1
                          ? "text-amber-600"
                          : standing.position === 2
                          ? "text-slate-500"
                          : standing.position === 3
                          ? "text-orange-600"
                          : "text-charcoal/60"
                      }`}
                    >
                      {standing.position}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-charcoal leading-tight">
                        {standing.player_name}
                      </h3>
                      <p className="text-sm text-charcoal/60">
                        {standing.competitions_played} of {standings.total_competitions} competitions
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <span className="text-lg font-bold text-charcoal">
                        {standing.total_points}
                      </span>
                      <span className="text-sm text-charcoal/50 ml-1">pts</span>
                    </div>

                    {/* Expand Arrow */}
                    <ChevronDown
                      className={`h-4 w-4 text-charcoal/40 transition-transform ${
                        expandedPlayers.has(standing.player_id) ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Competition Details - Expandable */}
                {expandedPlayers.has(standing.player_id) && (
                  <div className="bg-rough/10 border-l-4 border-l-turf/30 ml-4 mr-4 mb-4">
                    <div className="divide-y divide-soft-grey/50">
                      {standing.competitions.map((competition) => {
                        const enhancedComp = competition as EnhancedCompetition;
                        const isFuture = enhancedComp.is_future;
                        const notParticipated = enhancedComp.not_participated;

                        return (
                          <div
                            key={competition.competition_id}
                            className={`flex items-center gap-3 py-3 px-4 transition-colors ${
                              isFuture || notParticipated
                                ? "opacity-50"
                                : "cursor-pointer hover:bg-gray-50/50"
                            }`}
                            onClick={
                              isFuture || notParticipated
                                ? undefined
                                : (e) => handleCompetitionClick(competition.competition_id, e)
                            }
                          >
                            {/* Position - plain text */}
                            <span
                              className={`w-5 text-sm font-bold ${
                                isFuture || notParticipated
                                  ? "text-charcoal/30"
                                  : competition.position === 1
                                  ? "text-amber-600"
                                  : competition.position === 2
                                  ? "text-slate-500"
                                  : competition.position === 3
                                  ? "text-orange-600"
                                  : "text-charcoal/60"
                              }`}
                            >
                              {isFuture ? "–" : notParticipated ? "–" : competition.position}
                            </span>

                            {/* Competition Info */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-charcoal">
                                {competition.competition_name}
                              </span>
                              <span className="text-xs text-charcoal/50 ml-2">
                                {new Date(competition.competition_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>

                            {/* Score and Points */}
                            {!isFuture && !notParticipated && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-charcoal/60">
                                  {formatScore(competition.score_relative_to_par)}
                                </span>
                                <span className="font-semibold text-charcoal">
                                  {competition.points} pts
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </PlayerPageLayout>
  );
}
