import { useState, useEffect } from "react";
import { formatToPar, getToParColor } from "../../utils/scoreCalculations";
import type { LeaderboardEntry, TourScoringMode, TeeInfo, LeaderboardCategory, CategoryTee } from "../../api/competitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerNameLink } from "@/components/player/PlayerNameLink";

interface LeaderboardComponentProps {
  leaderboard: LeaderboardEntry[] | undefined;
  leaderboardLoading: boolean;
  onParticipantClick: (participantId: number) => void;
  // For CompetitionRound context
  isRoundView?: boolean;
  // For Tour competitions - hide team/position info
  isTourCompetition?: boolean;
  // Scoring mode from tour
  scoringMode?: TourScoringMode;
  // Tee info for display (default/single tee)
  teeInfo?: TeeInfo;
  // Category-specific tee assignments (when categories use different tees)
  categoryTees?: CategoryTee[];
  // Categories for filtering (only for tour competitions)
  categories?: LeaderboardCategory[];
}

export function LeaderboardComponent({
  leaderboard,
  leaderboardLoading,
  onParticipantClick,
  isRoundView = false,
  isTourCompetition = false,
  scoringMode,
  teeInfo,
  categoryTees,
  categories,
}: LeaderboardComponentProps) {
  // Filter state
  const [filter, setFilter] = useState<"all" | "finished">("all");
  // Category filter - default to first category if available
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  // Sort mode for when scoring_mode is 'both' - defaults to 'net' for net-aware modes
  const [sortBy, setSortBy] = useState<"gross" | "net">(
    scoringMode === "net" || scoringMode === "both" ? "net" : "gross"
  );

  // Set first category as default when categories become available
  useEffect(() => {
    if (categories && categories.length > 0 && selectedCategoryId === undefined) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Check if we should show net scores
  const showNetScores = scoringMode === "net" || scoringMode === "both";

  // Helper function to determine player status
  const getPlayerStatus = (entry: LeaderboardEntry) => {
    // DNF takes priority - competition closed and didn't finish
    if (entry.isDNF) return "DNF";

    const hasInvalidRound = entry.participant.score.includes(-1);
    const isLocked = entry.participant.is_locked;
    const hasStarted = entry.holesPlayed > 0;

    if (!hasStarted) return "NOT_STARTED";
    if (isLocked && !hasInvalidRound) return "FINISHED";
    return "IN_PROGRESS";
  };

  // Helper function to get display progress
  const getDisplayProgress = (entry: LeaderboardEntry) => {
    const status = getPlayerStatus(entry);

    if (status === "DNF") return "DNF";
    if (status === "NOT_STARTED") {
      if (entry.startTime) {
        // startTime is in "HH:MM" format, so we can return it directly
        return entry.startTime;
      }
      return "TBD";
    }
    if (status === "FINISHED") return "F";
    return entry.holesPlayed.toString();
  };

  // Shared sorting logic for both mobile and desktop views
  const sortedLeaderboard = leaderboard
    ? [...leaderboard].sort((a, b) => {
        // DNF entries always go to the bottom
        if (a.isDNF && !b.isDNF) return 1;
        if (!a.isDNF && b.isDNF) return -1;
        // Among DNF entries, sort by holes played (more holes = higher)
        if (a.isDNF && b.isDNF) {
          return b.holesPlayed - a.holesPlayed;
        }

        // Check if rounds are invalid (contain -1 scores)
        const aHasInvalidRound = a.participant.score.includes(-1);
        const bHasInvalidRound = b.participant.score.includes(-1);

        // Check if players have started (holes played > 0)
        const aStarted = a.holesPlayed > 0;
        const bStarted = b.holesPlayed > 0;

        // Category 1: Valid scores (started, no -1 scores, not DNF)
        const aHasValidScore = aStarted && !aHasInvalidRound;
        const bHasValidScore = bStarted && !bHasInvalidRound;

        // Category 2: Invalid scores (started, has -1 scores)
        const aHasInvalidScore = aStarted && aHasInvalidRound;
        const bHasInvalidScore = bStarted && bHasInvalidRound;

        // Category 3: Not started (0 holes played)
        const aNotStarted = !aStarted;
        const bNotStarted = !bStarted;

        // Sort by category priority: Valid scores first, then invalid scores, then not started
        if (aHasValidScore && !bHasValidScore) return -1;
        if (!aHasValidScore && bHasValidScore) return 1;

        if (aHasInvalidScore && bNotStarted) return -1;
        if (aNotStarted && bHasInvalidScore) return 1;

        // Within valid scores category: sort by score (best score first)
        if (aHasValidScore && bHasValidScore) {
          // Use net score for sorting if sorting by net
          if (sortBy === "net") {
            // Handle cases where net scores might be undefined
            const aNet = a.netRelativeToPar ?? a.relativeToPar;
            const bNet = b.netRelativeToPar ?? b.relativeToPar;
            return aNet - bNet;
          }
          return a.relativeToPar - b.relativeToPar;
        }

        // Within invalid scores category: maintain original order
        if (aHasInvalidScore && bHasInvalidScore) {
          return 0;
        }

        // Within not started category: maintain original order
        if (aNotStarted && bNotStarted) {
          return 0;
        }

        return 0;
      })
    : [];

  // Apply filters (status filter + category filter)
  const filteredLeaderboard = sortedLeaderboard.filter((entry) => {
    // Apply status filter
    if (filter === "finished" && getPlayerStatus(entry) !== "FINISHED") {
      return false;
    }
    // Apply category filter (only when categories exist and one is selected)
    if (selectedCategoryId !== undefined && entry.participant.category_id !== selectedCategoryId) {
      return false;
    }
    return true;
  });

  // Helper function to get position styling
  const getPositionStyling = (index: number, holesPlayed: number, isDNF?: boolean) => {
    if (isDNF) {
      return "border-red-300 text-red-500";
    }
    if (holesPlayed === 0) {
      return "border-gray-300 text-gray-500";
    }
    switch (index) {
      case 0:
        return "border-yellow-400 text-yellow-400"; // Gold
      case 1:
        return "border-gray-400 text-gray-400"; // Silver
      case 2:
        return "border-orange-400 text-orange-400"; // Bronze
      default:
        return "border-gray-300 text-gray-500";
    }
  };

  // Helper function to get row background for table
  const getRowBackground = (index: number, holesPlayed: number, isDNF?: boolean) => {
    if (isDNF) return "bg-red-50/50 hover:bg-red-100/50";
    if (holesPlayed === 0) return "bg-scorecard hover:bg-gray-50";
    switch (index) {
      case 0:
        return "bg-yellow-50 hover:bg-yellow-100"; // Gold
      case 1:
        return "bg-gray-50 hover:bg-gray-100"; // Silver
      case 2:
        return "bg-orange-50 hover:bg-orange-100"; // Bronze
      default:
        return "bg-scorecard hover:bg-gray-50";
    }
  };

  const content = (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Leaderboard
          </h2>
          {/* Show tee info - prefer category tees over default tee */}
          {categoryTees && categoryTees.length > 0 ? (
            <div className="text-xs text-turf font-primary mt-1 space-y-0.5">
              {categoryTees.map((ct) => (
                <div key={ct.categoryId}>
                  <span className="font-medium">{ct.categoryName}:</span>{" "}
                  {ct.teeName} (CR: {ct.courseRating.toFixed(1)}, SR: {ct.slopeRating})
                </div>
              ))}
            </div>
          ) : teeInfo ? (
            <div className="text-xs text-turf font-primary mt-1">
              <span
                className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                style={{ backgroundColor: teeInfo.color || '#666' }}
              />
              {teeInfo.name} Tees (CR: {teeInfo.courseRating.toFixed(1)}, SR: {teeInfo.slopeRating})
            </div>
          ) : null}
        </div>
        <div className="text-xs md:text-sm text-turf font-primary">
          Live scoring
        </div>
      </div>

      {/* Filter Controls - Row 1: Category + Gross/Net (matching TourStandings layout) */}
      {((categories && categories.length >= 1) || scoringMode === "both") && (
        <div className="flex items-center justify-between gap-4 pb-2">
          {/* Category Dropdown or Label */}
          {categories && categories.length > 1 && selectedCategoryId !== undefined ? (
            <Select
              value={selectedCategoryId.toString()}
              onValueChange={(value: string) => setSelectedCategoryId(Number(value))}
            >
              <SelectTrigger className="w-auto min-w-[120px] pr-4 bg-scorecard border-soft-grey text-charcoal">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-scorecard border-soft-grey">
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id.toString()}
                    className="text-charcoal"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : categories && categories.length === 1 ? (
            <span className="text-sm font-medium text-charcoal px-3 py-1.5 bg-rough/20 rounded-lg">
              {categories[0].name}
            </span>
          ) : (
            <div /> /* Spacer when no categories */
          )}

          {/* Gross/Net toggle when scoring mode is 'both' */}
          {scoringMode === "both" && (
            <div className="flex rounded-lg overflow-hidden border border-soft-grey">
              <button
                onClick={() => setSortBy("gross")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === "gross"
                    ? "bg-turf text-scorecard"
                    : "bg-scorecard text-charcoal hover:bg-rough/30"
                }`}
              >
                Gross
              </button>
              <button
                onClick={() => setSortBy("net")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-soft-grey ${
                  sortBy === "net"
                    ? "bg-turf text-scorecard"
                    : "bg-scorecard text-charcoal hover:bg-rough/30"
                }`}
              >
                Net
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Controls - Row 2: All/Only Finished */}
      <div className="flex items-center gap-2 pb-2">
        <div className="flex rounded-lg overflow-hidden border border-soft-grey">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-turf text-scorecard"
                : "bg-scorecard text-charcoal hover:bg-rough/30"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("finished")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-soft-grey ${
              filter === "finished"
                ? "bg-turf text-scorecard"
                : "bg-scorecard text-charcoal hover:bg-rough/30"
            }`}
          >
            Only Finished
          </button>
        </div>
        <span className="text-sm text-charcoal/60 ml-auto">
          {filteredLeaderboard.length} players
        </span>
      </div>

      {leaderboardLoading ? (
        <div className="p-4 text-charcoal font-primary">
          Loading leaderboard...
        </div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
          No scores reported yet.
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden">
            {/* Header Row */}
            <div className="flex items-center px-4 py-2 border-b-2 border-soft-grey bg-gray-50 text-xs text-gray-500 font-medium">
              <div className="w-7 mr-2">#</div>
              <div className="flex-1 min-w-0">Player</div>
              <div className={`flex items-center ${showNetScores ? 'gap-1' : ''}`}>
                <div className="w-10 text-center">Gross</div>
                {showNetScores && <div className="w-10 text-center">Net</div>}
                <div className="w-8 text-center">Thru</div>
              </div>
            </div>

            {filteredLeaderboard.map((entry, index) => {
              const isRoundInvalid = entry.participant.score.includes(-1);
              const isLeader = index === 0 && entry.holesPlayed > 0 && !entry.isDNF;
              const status = getPlayerStatus(entry);
              const displayProgress = getDisplayProgress(entry);

              return (
                <button
                  key={entry.participant.id}
                  onClick={() => onParticipantClick(entry.participant.id)}
                  className={`w-full text-left px-4 py-2.5 border-b border-soft-grey/50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                    isLeader ? "border-l-4 border-l-coral bg-coral/5" : ""
                  } ${entry.isDNF ? "bg-red-50/50" : ""}`}
                >
                  <div className="flex items-center">
                    {/* Position Number */}
                    <div
                      className={`w-7 text-base font-bold mr-2 ${getPositionStyling(
                        index,
                        entry.holesPlayed,
                        entry.isDNF
                      )}`}
                    >
                      {entry.isDNF ? "-" : entry.holesPlayed === 0 ? "-" : index + 1}
                    </div>

                    {/* Player Info - truncate long names */}
                    <div className="flex-1 min-w-0 mr-2">
                      {entry.participant.player_names ? (
                        <>
                          <h3 className={`text-sm font-semibold font-display truncate ${entry.isDNF ? "text-gray-500" : "text-charcoal"}`}>
                            <PlayerNameLink
                              playerId={entry.participant.player_id}
                              playerName={entry.participant.player_names}
                              skipFriendCheck={isTourCompetition}
                            />
                          </h3>
                          {showNetScores && entry.participant.handicap_index !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-turf font-primary">
                                HCP {entry.participant.handicap_index.toFixed(1)}
                              </span>
                              {entry.courseHandicap !== undefined && (
                                <span className="text-xs bg-coral/20 text-coral px-1 py-0.5 rounded font-medium font-primary">
                                  PH {entry.courseHandicap}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <h3 className={`text-sm font-semibold font-display truncate ${entry.isDNF ? "text-gray-500" : "text-charcoal"}`}>
                          {isTourCompetition
                            ? entry.participant.position_name
                            : `${entry.participant.team_name} ${entry.participant.position_name}`}
                        </h3>
                      )}
                    </div>

                    {/* Score Section - Gross/Net/Thru with fixed widths */}
                    <div className={`flex items-center ${showNetScores ? 'gap-1' : ''}`}>
                      {status === "NOT_STARTED" ? (
                        <div className="w-10 text-center text-sm text-gray-500">
                          {displayProgress}
                        </div>
                      ) : status === "DNF" ? (
                        <>
                          {/* DNF - show partial score greyed out */}
                          <div className="w-10 text-center text-lg font-bold text-gray-400">
                            {entry.holesPlayed > 0 ? formatToPar(entry.relativeToPar) : "-"}
                          </div>
                          {showNetScores && (
                            <div className="w-10 text-center text-lg font-bold text-gray-400">
                              -
                            </div>
                          )}
                          <div className="w-8 text-center text-xs font-bold text-red-500">
                            DNF
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Gross Score */}
                          <div
                            className={`w-10 text-center text-lg font-bold ${
                              isRoundInvalid
                                ? "text-gray-400"
                                : getToParColor(entry.relativeToPar)
                            }`}
                          >
                            {isRoundInvalid ? "-" : formatToPar(entry.relativeToPar)}
                          </div>

                          {/* Net Score */}
                          {showNetScores && (
                            <div
                              className={`w-10 text-center text-lg font-bold ${
                                isRoundInvalid || entry.netRelativeToPar === undefined
                                  ? "text-gray-400"
                                  : getToParColor(entry.netRelativeToPar)
                              }`}
                            >
                              {isRoundInvalid || entry.netRelativeToPar === undefined
                                ? "-"
                                : formatToPar(entry.netRelativeToPar)}
                            </div>
                          )}

                          {/* Thru (Hole progress) */}
                          <div className="w-8 text-center text-base font-semibold text-gray-600">
                            {displayProgress}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="bg-scorecard rounded-lg border border-soft-grey overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-soft-grey">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Pos
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      {isTourCompetition ? "Player" : "Player/Team"}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Hole & Score
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-charcoal font-display"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((entry, index) => {
                    const isRoundInvalid = entry.participant.score.includes(-1);
                    const status = getPlayerStatus(entry);
                    const displayProgress = getDisplayProgress(entry);

                    return (
                      <tr
                        key={entry.participant.id}
                        className={`border-b border-soft-grey last:border-b-0 transition-colors duration-200 ${getRowBackground(
                          index,
                          entry.holesPlayed,
                          entry.isDNF
                        )}`}
                      >
                        <td className="py-4 px-4">
                          <div
                            className={`text-sm font-bold ${getPositionStyling(
                              index,
                              entry.holesPlayed,
                              entry.isDNF
                            )}`}
                          >
                            {entry.isDNF ? "-" : entry.holesPlayed === 0 ? "-" : index + 1}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            {entry.participant.player_names ? (
                              // Player has a name - show player name prominently
                              <>
                                <div className={`text-body-md font-semibold font-display ${entry.isDNF ? "text-gray-500" : "text-charcoal"}`}>
                                  <PlayerNameLink
                                    playerId={entry.participant.player_id}
                                    playerName={entry.participant.player_names}
                                    skipFriendCheck={isTourCompetition}
                                  />
                                </div>
                                {/* Hide team/position for Tour competitions */}
                                {!isTourCompetition && (
                                  <div className="text-label-sm text-turf font-primary">
                                    {entry.participant.team_name}{" "}
                                    {entry.participant.position_name}
                                  </div>
                                )}
                              </>
                            ) : (
                              // No player name - show team name + position (unless Tour competition)
                              <>
                                <div className={`text-body-md font-semibold font-display ${entry.isDNF ? "text-gray-500" : "text-charcoal"}`}>
                                  {isTourCompetition
                                    ? entry.participant.position_name
                                    : `${entry.participant.team_name} ${entry.participant.position_name}`}
                                </div>
                              </>
                            )}
                            {/* Show handicap info when net scoring enabled */}
                            {showNetScores && entry.participant.handicap_index !== undefined && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-turf font-primary">
                                  HCP {entry.participant.handicap_index.toFixed(1)}
                                </span>
                                {entry.courseHandicap !== undefined && (
                                  <span className="text-xs bg-coral/20 text-coral px-1.5 py-0.5 rounded font-medium font-primary">
                                    PH {entry.courseHandicap}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {status === "NOT_STARTED" ? (
                            <div className="text-center">
                              <div className="text-xs text-gray-500">
                                Start Time
                              </div>
                              <div className="text-base font-medium text-gray-500">
                                {displayProgress}
                              </div>
                            </div>
                          ) : status === "DNF" ? (
                            <div className="flex items-center justify-center space-x-4">
                              {/* DNF Status */}
                              <div className="text-center">
                                <div className="text-xs text-gray-500">
                                  Status
                                </div>
                                <div className="text-xl font-bold text-red-500 font-display">
                                  DNF
                                </div>
                              </div>

                              {/* Partial Score */}
                              <div className="text-center">
                                <div className="text-xs text-gray-500">
                                  Thru {entry.holesPlayed}
                                </div>
                                <div className="text-xl font-bold text-gray-400 font-display">
                                  {entry.holesPlayed > 0 ? formatToPar(entry.relativeToPar) : "-"}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-4">
                              {/* Hole Number */}
                              <div className="text-center">
                                <div className="text-xs text-gray-500">
                                  Hole
                                </div>
                                <div className="text-xl font-bold text-charcoal font-display">
                                  {displayProgress}
                                </div>
                              </div>

                              {/* Gross Score */}
                              {status === "FINISHED" ? (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    {showNetScores ? "Gross" : "Total"}
                                  </div>
                                  <div className="text-xl font-bold text-charcoal font-display">
                                    {isRoundInvalid ? "-" : entry.totalShots}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    {showNetScores ? "Gross" : "To Par"}
                                  </div>
                                  <div
                                    className={`text-xl font-bold font-display ${
                                      isRoundInvalid
                                        ? "text-gray-500"
                                        : getToParColor(entry.relativeToPar)
                                    }`}
                                  >
                                    {isRoundInvalid
                                      ? "-"
                                      : formatToPar(entry.relativeToPar)}
                                  </div>
                                </div>
                              )}

                              {/* Net Score - only show when scoring mode includes net */}
                              {showNetScores && (
                                status === "FINISHED" ? (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">Net</div>
                                    <div className="text-xl font-bold text-charcoal font-display">
                                      {isRoundInvalid || entry.netTotalShots === undefined
                                        ? "-"
                                        : entry.netTotalShots}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">Net</div>
                                    <div
                                      className={`text-xl font-bold font-display ${
                                        isRoundInvalid || entry.netRelativeToPar === undefined
                                          ? "text-gray-500"
                                          : getToParColor(entry.netRelativeToPar)
                                      }`}
                                    >
                                      {isRoundInvalid || entry.netRelativeToPar === undefined
                                        ? "-"
                                        : formatToPar(entry.netRelativeToPar)}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() =>
                              onParticipantClick(entry.participant.id)
                            }
                            className="bg-turf text-scorecard px-3 py-2 rounded-md text-sm font-medium hover:bg-fairway transition-colors duration-200 font-primary"
                          >
                            View Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // For CompetitionRound.tsx - wrap in scrollable container
  if (isRoundView) {
    return (
      <div className="h-full overflow-y-auto bg-scorecard">
        <div className="p-4">{content}</div>
      </div>
    );
  }

  // For CompetitionDetail.tsx - return content directly
  return content;
}
